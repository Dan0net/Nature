import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from '../../libraries/raycast-bvh/RaycastBVH';
import VolumetricChunk from '../../libraries/volumetric-terrain/VolumetricChunk';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler';
import BuildPresets from '../player/BuildPresets';

export default class Chunk extends VolumetricChunk {

	constructor( ...args ) {

		super( ...args );

		this.lodLevel = 0;
		this.sampler;
		this.adjustedBuffer = [];
		this.adjustedIndices = new Int8Array( this.terrain.gridSize.x * this.terrain.gridSize.y * this.terrain.gridSize.z );
		this.adjustedIndicesTemp = new Int8Array( this.terrain.gridSize.x * this.terrain.gridSize.y * this.terrain.gridSize.z );

		this.lightBuffer = [];
		this.lightIncidents = new Float32Array( this.terrain.gridSize.x * this.terrain.gridSize.y * this.terrain.gridSize.z );
		this.lightIndices = new Float32Array( this.terrain.gridSize.x * this.terrain.gridSize.y * this.terrain.gridSize.z );
		this.lightNeedsUpdating = false;
	}

	flipMesh() {

		super.flipMesh();
		if (this.mesh) this.sampler = new MeshSurfaceSampler( this.mesh ).build();
		// console.log(this.sampler)
		// this.showLevel();

	}


	generateMeshData() {

		return new Promise( resolve =>{

			this.terrain.meshWorkerBank.work(
				{
					grid: this.useTemporaryGrid ? this.gridTemp : this.grid,
					gridSize: this.terrain.gridSize,
					terrainHeights: this.terrainHeights,
					adjustedIndices: this.useTemporaryGrid ? this.adjustedIndicesTemp : this.adjustedIndices,
					lightIncidents: this.lightIncidents,
					lightIndices: this.lightIndices,
					regenerateLights: this.lightNeedsUpdating
				},
				async ( { data } ) => {

					this.lightNeedsUpdating = false;
					this.generateMesh( data );

					resolve( this.chunkKey );

				}
			);

		} );

	}

	generateGrid() {

		return new Promise( resolve => {

			this.terrain.gridWorkerBank.work(
				{
					offset: this.offset,
					gridSize: this.terrain.gridSize,
					terrainScale: this.terrain.terrainScale
				},
				async ( { data } ) => {

					this.grid = data.grid;
					this.gridTemp = new Float32Array(data.grid);
					this.terrainHeights = data.terrainHeights;

					this.adjust( 
						this.position.clone().add(
							new THREE.Vector3(5,5,5)
						), 
						new THREE.Vector3(6,6,6),
						BuildPresets[3], 
						false 
					);

					if ( this.terrain.DB ) {

						const data = await this.terrain.DB.getAll( this.chunkKey );
						for ( let { index, value, adjust, light } of data ) {

							this.grid[ index ] = value;
							this.adjustedIndices[ index ] = adjust;
							this.lightIndices[ index ] = light;

						}

					}

					resolve();

				}
			);

		} );

	}

										
	//                      88           88  
	//                      88           88  
	//                      88           88  
	// ,adPPYYba,   ,adPPYb,88   ,adPPYb,88  
	// ""     `Y8  a8"    `Y88  a8"    `Y88  
	// ,adPPPPP88  8b       88  8b       88  
	// 88,    ,88  "8a,   ,d88  "8a,   ,d88  
	// `"8bbdP"Y8   `"8bbdP"Y8   `"8bbdP"Y8  								
	// 88           88               88                   
	// 88           ""               88            ,d     
	// 88                            88            88     
	// 88           88   ,adPPYb,d8  88,dPPYba,  MM88MMM  
	// 88           88  a8"    `Y88  88P'    "8a   88     
	// 88           88  8b       88  88       88   88     
	// 88           88  "8a,   ,d88  88       88   88,    
	// 88888888888  88   `"YbbdP"Y8  88       88   "Y888  
	//                   aa,    ,88                       
	//                    "Y8bbdP"                       
	
	addLight( center, value = 1.0 ) {
		const localCenter = this.worldToChunkPosition( center ).round();

		const index = this.gridIndex( localCenter.x, localCenter.y, localCenter.z );
		
		this.lightIncidents[ index ] = value;

		this.needsUpdate = true;
		this.lightNeedsUpdating = true;
	}

	// async adjustGrid( ...args ) {

	// 	super.adjustGrid( ...args );

	// 	if ( this.terrain.DB && this.adjustedBuffer.length > 0 ) {

	// 		this.terrain.DB.add( this.chunkKey, this.adjustedBuffer )
	// 			.then( () => {

	// 				this.adjustedBuffer.length = 0;

	// 			} );

	// 	}

	// }

	saveGridPosition( gridPosition, materialInd ) {
		const a = this.useTemporaryGrid ? this.adjustedIndicesTemp : this.adjustedIndices;

		const index = this.gridIndex( gridPosition.x, gridPosition.y, gridPosition.z );
		a[ index ] = materialInd;

		if ( !this.useTemporaryGrid) {
			if ( this.terrain.DB ) this.adjustedBuffer.push( { 
				index, 
				value: this.grid[ index ], 
				adjust: this.adjustedIndices [index],
				light: this.lightIndices [index] 
			} );
		}

	}

	dispose() {

		super.dispose();

		if ( this.LODMesh ) {

			this.LODMesh.geometry.dispose();
			this.terrain.remove( this.LODMesh );
			this.LODMesh = undefined;

		}

	}

}
