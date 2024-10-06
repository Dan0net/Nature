import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from '../../libraries/raycast-bvh/RaycastBVH';
import VolumetricChunk from '../../libraries/volumetric-terrain/VolumetricChunk';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler';

export default class Chunk extends VolumetricChunk {

	constructor( ...args ) {

		super( ...args );

		this.lodLevel = 0;
		this.sampler;
		this.adjustedBuffer = [];
		this.adjustedIndices = new Int8Array( this.terrain.gridSize.x * this.terrain.gridSize.y * this.terrain.gridSize.z );
		this.adjustedIndicesTemp = new Int8Array( this.terrain.gridSize.x * this.terrain.gridSize.y * this.terrain.gridSize.z );

	}

	flipMesh() {

		super.flipMesh();
		// this.sampler = new MeshSurfaceSampler( this.mesh ).build();
		// this.showLevel();

	}


	generateMeshData() {

		return new Promise( resolve =>{

			this.terrain.meshWorkerBank.work(
				{
					grid: this.useTemporaryGrid ? this.gridTemp : this.grid,
					gridSize: this.terrain.gridSize,
					terrainHeights: this.terrainHeights,
					adjustedIndices: this.useTemporaryGrid ? this.adjustedIndicesTemp : this.adjustedIndices
				},
				async ( { data } ) => {

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

					if ( this.terrain.DB ) {

						const data = await this.terrain.DB.getAll( this.chunkKey );
						for ( let { index, value, adjust } of data ) {

							this.grid[ index ] = value;
							this.adjustedIndices[ index ] = adjust;

						}

					}

					resolve();

				}
			);

		} );

	}

	async adjustGrid( ...args ) {

		super.adjustGrid( ...args );

		if ( this.terrain.DB && this.adjustedBuffer.length > 0 ) {

			this.terrain.DB.add( this.chunkKey, this.adjustedBuffer )
				.then( () => {

					this.adjustedBuffer.length = 0;

				} );

		}

	}

	saveGridPosition( gridPosition, materialInd ) {
		const a = this.useTemporaryGrid ? this.adjustedIndicesTemp : this.adjustedIndices;

		const index = this.gridIndex( gridPosition.x, gridPosition.y, gridPosition.z );
		a[ index ] = materialInd;

		if ( !this.useTemporaryGrid) {
			if ( this.terrain.DB ) this.adjustedBuffer.push( { 
				index, 
				value: this.grid[ index ], 
				adjust: this.adjustedIndices [index] 
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
