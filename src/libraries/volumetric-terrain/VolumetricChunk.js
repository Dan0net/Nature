import BuildPresets from '../../js/player/BuildPresets';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from '../../libraries/raycast-bvh/RaycastBVH';
import * as THREE from 'three';

const CHUNK_OVERLAP = 2;

export default class VolumetricChunk {

	constructor( x, y, z, terrain, callback ) {	
		//parent
		this.terrain = terrain;
		this.needsUpdate = false;

		//offset coordinates
		this.offset = { x, y, z };
		this.chunkKey = this.terrain.getChunkKey( this.offset );

		//terrain generation vars
		this.position = new THREE.Vector3(
			this.offset.x * ( this.terrain.gridSize.x - CHUNK_OVERLAP ) * this.terrain.terrainScale.x,
			this.offset.y * ( this.terrain.gridSize.y - CHUNK_OVERLAP ) * this.terrain.terrainScale.y,
			this.offset.z * ( this.terrain.gridSize.z - CHUNK_OVERLAP ) * this.terrain.terrainScale.z
		);

		this.grid;
		this.gridTemp;
		this.useTemporaryGrid = false;
		this.terrainHeights;
		
		this.meshObjs = {};
		this.mesh;
		this.meshTempObjs = {};
		this.meshTemp;

		this.debugGeom = new THREE.BoxGeometry(
			( this.terrain.gridSize.x - CHUNK_OVERLAP ) * this.terrain.terrainScale.x,
			( this.terrain.gridSize.y - CHUNK_OVERLAP ) * this.terrain.terrainScale.y,
			( this.terrain.gridSize.z - CHUNK_OVERLAP ) * this.terrain.terrainScale.z
		)

		this.debugWireframeMaterial = new THREE.LineBasicMaterial( { 
			color: 0xff0000
		 } );

		this.debugWireframe = new THREE.LineSegments( 
			this.debugGeom, 
			this.debugWireframeMaterial 
		);
		this.debugWireframe.position.copy(this.position);

		// this.terrain.add(this.debugWireframe);

		//initialize the grid
		this.generateGrid()
			.then( () => {

				this.generateMeshData().then( ()=>{

					callback( this );

				} );

			} );

	}

	getTerrainHeight( x, z ) {

		return this.terrainHeights[ z * this.terrain.gridSize.x + x ];

	}

	flipMesh() {

		if ( this.mesh ) this.mesh.visible = false;
		if (this.meshTemp) this.meshTemp.visible = false;

		if ( this.useTemporaryGrid && this.meshTempObjs.buffer ) {
			// console.log('temp flip')
			this.meshTemp.geometry.dispose();
			this.meshTemp.geometry = this.meshTempObjs.buffer;

			this.meshTemp.visible = true;
		} else if ( this.meshObjs.buffer ) {
			this.mesh.geometry.dispose();
			this.mesh.geometry = this.meshObjs.buffer;

			this.mesh.visible = true;
		} 

		this.debugWireframeMaterial.color.set(this.useTemporaryGrid ? 0xFFFF00 : 0x00FF00);
		this.debugWireframeMaterial.needsUpdate = true;
	}

	//                              .o8                .
	//                             "888              .o8
	// oooo  oooo  oo.ooooo.   .oooo888   .oooo.   .o888oo  .ooooo.
	// `888  `888   888' `88b d88' `888  `P  )88b    888   d88' `88b
	//  888   888   888   888 888   888   .oP"888    888   888ooo888
	//  888   888   888   888 888   888  d8(  888    888 . 888    .o
	//  `V88V"V8P'  888bod8P' `Y8bod88P" `Y888""8o   "888" `Y8bod8P'
	//              888
	//             o888o


	update() {

		return this.generateMeshData();

	}

	//  o8o               o8o      .
	//  `"'               `"'    .o8
	// oooo  ooo. .oo.   oooo  .o888oo
	// `888  `888P"Y88b  `888    888
	//  888   888   888   888    888
	//  888   888   888   888    888 .
	// o888o o888o o888o o888o   "888"
	//                      o8o        .o8
	//                      `"'       "888
	//  .oooooooo oooo d8b oooo   .oooo888
	// 888' `88b  `888""8P `888  d88' `888
	// 888   888   888      888  888   888
	// `88bod8P'   888      888  888   888
	// `8oooooo.  d888b    o888o `Y8bod88P"
	// d"     YD
	// "Y88888P'


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

					resolve();

				}
			);

		} );

	}

	//                                                                   .
	//                                                                 .o8
	//  .oooooooo  .ooooo.  ooo. .oo.    .ooooo.  oooo d8b  .oooo.   .o888oo  .ooooo.
	// 888' `88b  d88' `88b `888P"Y88b  d88' `88b `888""8P `P  )88b    888   d88' `88b
	// 888   888  888ooo888  888   888  888ooo888  888      .oP"888    888   888ooo888
	// `88bod8P'  888    .o  888   888  888    .o  888     d8(  888    888 . 888    .o
	// `8oooooo.  `Y8bod8P' o888o o888o `Y8bod8P' d888b    `Y888""8o   "888" `Y8bod8P'
	// d"     YD
	// "Y88888P'

	//                                      oooo
	//                                      `888
	// ooo. .oo.  .oo.    .ooooo.   .oooo.o  888 .oo.
	// `888P"Y88bP"Y88b  d88' `88b d88(  "8  888P"Y88b
	//  888   888   888  888ooo888 `"Y88b.   888   888
	//  888   888   888  888    .o o.  )88b  888   888
	// o888o o888o o888o `Y8bod8P' 8""888P' o888o o888o

	generateMeshData() {
		return new Promise( resolve =>{

			this.debugWireframeMaterial.color.set(0xFF0000);
			this.debugWireframeMaterial.needsUpdate = true;

			this.terrain.meshWorkerBank.work(
				{
					grid: this.useTemporaryGrid ? this.gridTemp : this.grid,
					gridSize: this.terrain.gridSize,
					terrainHeights: this.terrainHeights
				},
				async ( { data } ) => {

					this.generateMesh( data );

					resolve( this.chunkKey );

				}
			);

		} );

	}

	generateMesh( data ) {

		const {
			indices,
			vertices,
			adjusted,
			bary,
			light
		} = data;

		if ( indices.length === 0 ) return;

		const meshObjs = this.useTemporaryGrid ? this.meshTempObjs : this.meshObjs;

		//create new geometry
		const buffer = new THREE.BufferGeometry();
		buffer.computeBoundsTree = computeBoundsTree;
		buffer.disposeBoundsTree = disposeBoundsTree;

		if ( meshObjs.mesh === undefined ) {
			//create new mesh with preloaded material
			const mesh = new THREE.Mesh( 
				buffer, 
				this.terrain.material // this.useTemporaryGrid ? this.terrain.materialTemp : this.terrain.material 
			);
			mesh.scale.set( this.terrain.terrainScale.x, this.terrain.terrainScale.y, this.terrain.terrainScale.z );
			mesh.chunk = this;
			mesh.position.x = this.position.x;
			mesh.position.y = this.position.y;
			mesh.position.z = this.position.z;
			// mesh.material.needsUpdate = true;
			// if (!this.useTemporaryGrid) {
				mesh.castShadow = true;
				mesh.receiveShadow = true;
			// }

			mesh.updateWorldMatrix();
			mesh.matrixAutoUpdate = false;

			if ( this.useTemporaryGrid ) {
				this.meshTemp = mesh;
				this.terrain.add(this.meshTemp);
			} else {
				this.mesh = mesh;
				this.terrain.add(this.mesh);
			}
			
			Object.assign(meshObjs, {
				mesh: mesh
			});
		}

		// meshObjs.mesh.geometry = meshObjs.buffer

		const indexBufferAttribute = new THREE.BufferAttribute( indices, 1 )
		buffer.setIndex( indexBufferAttribute );
		indexBufferAttribute.needsUpdate = true;

		const positionBufferAttribute = new THREE.Float32BufferAttribute( vertices, 3 )
		buffer.setAttribute( 'position', positionBufferAttribute );
		positionBufferAttribute.needsUpdate = true;
		
		const adjustedBufferAttribute = new THREE.BufferAttribute( adjusted, 3 )
		buffer.setAttribute( 'adjusted', adjustedBufferAttribute );
		adjustedBufferAttribute.needsUpdate = true;

		const baryBufferAttribute = new THREE.BufferAttribute( bary, 3 )
		buffer.setAttribute( 'bary', baryBufferAttribute );
		baryBufferAttribute.needsUpdate = true;

		const lightBufferAttribute = new THREE.BufferAttribute( light, 1 )
		buffer.setAttribute( 'light', lightBufferAttribute );
		lightBufferAttribute.needsUpdate = true;
		
		// meshObjs.indices.set(indices)

		// meshObjs.vertices.set(vertices)

		// meshObjs.adjusted.set(adjusted)

		buffer.computeVertexNormals();
		buffer.computeBoundsTree();

		Object.assign(meshObjs, {
			buffer: buffer,
			// indices: indices,
			// indexBufferAttribute: indexBufferAttribute,
			// vertices: vertices,
			// positionBufferAttribute: positionBufferAttribute,
			// adjusted: adjusted,
			// adjustedBufferAttribute: adjustedBufferAttribute,
			// bary: bary,
			// baryBufferAttribute: baryBufferAttribute
		});
	}


	//                 .o8      o8o                          .
	//                "888      `"'                        .o8
	//  .oooo.    .oooo888     oooo oooo  oooo   .oooo.o .o888oo
	// `P  )88b  d88' `888     `888 `888  `888  d88(  "8   888
	//  .oP"888  888   888      888  888   888  `"Y88b.    888
	// d8(  888  888   888      888  888   888  o.  )88b   888 .
	// `Y888""8o `Y8bod88P"     888  `V88V"V8P' 8""888P'   "888"
	//                          888
	//                      .o. 88P
	//                      `Y888P
	//                      o8o        .o8
	//                      `"'       "888
	//  .oooooooo oooo d8b oooo   .oooo888
	// 888' `88b  `888""8P `888  d88' `888
	// 888   888   888      888  888   888
	// `88bod8P'   888      888  888   888
	// `8oooooo.  d888b    o888o `Y8bod88P"
	// d"     YD
	// "Y88888P'


	adjust( center, buildExtents, buildConfiguration, useTemporaryGrid ) {		

		const localCenter = center.clone()
			.sub( this.position )
			.divide( this.terrain.terrainScale )
		if (buildConfiguration.gridSnap) localCenter.round()

		this.useTemporaryGrid = useTemporaryGrid;
		if ( useTemporaryGrid ) {
			this.gridTemp.set(this.grid)
			this.adjustedIndicesTemp.set(this.adjustedIndices);
			this.lightIndicesTemp.set(this.lightIndices);
		}

		this.adjustGrid( localCenter, buildExtents, buildConfiguration );
	}

	async adjustGrid( center, buildExtents, buildConfiguration ) {

		const drawFunc = {
			'sphere': this.drawSphere,
			'cube': this.drawCube,
			'cylinder': this.drawCylinder
		}[buildConfiguration.shape]

		//square loop around a sphere brush
		let loopRadius = buildConfiguration.size.x;

		let p;
		let gridPosition = new THREE.Vector3();
		let pos = new THREE.Vector3();
		const centerRounded = center.clone().round()

		const eulerInverse = buildConfiguration.rotation.clone()
		// eulerInverse.x = -eulerInverse.x;
		eulerInverse.y = -eulerInverse.y;
		// eulerInverse.z = -eulerInverse.z;

		const val = buildConfiguration.constructive ? 1 : -1;

		for ( let y = - buildExtents.y; y <= buildExtents.y; y ++ ) {

			for ( let z = - buildExtents.z; z <= buildExtents.z; z ++ ) {

				for ( let x = - buildExtents.x; x <= buildExtents.x; x ++ ) {
					gridPosition.set( x, y, z ).add( centerRounded );

					if ( this.isInsideGrid( gridPosition ) ) {
						pos.set(x, y, z).add( centerRounded ).sub ( center )
						// pos.applyEuler(buildConfiguration.rotation)
												
						pos.applyEuler(eulerInverse)						
						
						p = drawFunc( pos, buildConfiguration )
						
						this.addScaleValueToGrid( gridPosition.x, gridPosition.y, gridPosition.z, val * p );
						if (val > 0 && p > 0) {
							this.saveGridPosition( gridPosition, buildConfiguration.material );
						}
					}

				}

			}

		}

		//put this chunk in the list of chunk that need updates
		this.needsUpdate = true;
	}

	drawSphere ( pos, buildConfiguration ) {
		let d = pos.length() - buildConfiguration.size.x;
		
		// TODO Fix sphere weight
		return map( d, 0, 1.5, 1, 0, true );
	}

	drawCube ( pos, buildConfiguration ) {
		pos.set(Math.abs(pos.x), Math.abs(pos.y), Math.abs(pos.z))

		const q = pos.sub(buildConfiguration.size)
		const outsideD = q.clone().max(new THREE.Vector3(0,0,0)).length();
		const insideD = Math.min( Math.max(q.x,q.y,q.z), 0.0);
  		const d = outsideD + insideD;

		// console.log(q, outsideD, insideD)

		// return d < 0 ? Math.inf : 0;
		// return d;
		return map( d, 0, 1.5, 1, 0, true );
	}

	drawCylinder ( pos, buildConfiguration ) {
		const l = new THREE.Vector2(pos.x, pos.z).length();
		const d = new THREE.Vector2(
			Math.abs(l) - buildConfiguration.size.x, 
			Math.abs(pos.y) - buildConfiguration.size.y
		);

  		const a = min(max(d.x,d.y), 0.0) + d.max(new THREE.Vector2(0,0)).length();
		return map( a, 0, 1.1, 1, 0, true );
	}


	//  .o88o.                                       .    o8o
	//  888 `"                                     .o8    `"'
	// o888oo  oooo  oooo  ooo. .oo.    .ooooo.  .o888oo oooo   .ooooo.  ooo. .oo.    .oooo.o
	//  888    `888  `888  `888P"Y88b  d88' `"Y8   888   `888  d88' `88b `888P"Y88b  d88(  "8
	//  888     888   888   888   888  888         888    888  888   888  888   888  `"Y88b.
	//  888     888   888   888   888  888   .o8   888 .  888  888   888  888   888  o.  )88b
	// o888o    `V88V"V8P' o888o o888o `Y8bod8P'   "888" o888o `Y8bod8P' o888o o888o 8""888P'



	//add a value to the grid on coordinate xyz
	addValueToGrid( x, y, z, val ) {

		let gridOffset = this.gridIndex( x, y, z );
		return this.grid[ gridOffset ] = constrain( this.grid[ gridOffset ] + val, - 0.5, 0.5 );

	}

	//set value of the grid (used in initialization)
	setGridValue( x, y, z, val ) {

		let gridOffset = this.gridIndex( x, y, z );
		return this.grid[ gridOffset ] = val;

	}

	addScaleValueToGrid( x, y, z, val ) {

		let gridOffset = this.gridIndex( x, y, z );
		// const oldValueScale = map( abs( this.grid[ gridOffset ] ), 0, 0.5, 0.001, 3 );
		const g = this.useTemporaryGrid ? this.gridTemp : this.grid;
		// return this.gridTemp[ gridOffset ] = constrain( this.grid[ gridOffset ] + ( val * oldValueScale ), - 0.5, 0.5 );
		const v = val + this.grid[ gridOffset ]
		// return g[ gridOffset ] = v > 0 ? Math.nan : v;
		// return g[ gridOffset ] = Math.max(val, this.grid[ gridOffset ]);
		// return g[ gridOffset ] = v;
		return g[ gridOffset ] = constrain( v, - 0.5, 0.5 );
		// return g[ gridOffset ] = constrain( this.grid[ gridOffset ] + ( val * oldValueScale ), - 0.5, 0.5 );

	}

	saveGridPosition( ) {
	}

	//convert 3d coordinate into 1D index.
	gridIndex( x, y, z ) {

		return ( ( z * ( this.terrain.gridSize.x * this.terrain.gridSize.y ) ) + ( y * this.terrain.gridSize.z ) + x );

	}

	//check if coordinate is inside grid
	isInsideGrid( coord ) {

		return ( coord.x >= 0 && coord.x < this.terrain.gridSize.x &&
			coord.y >= 0 && coord.y < this.terrain.gridSize.y &&
			coord.z >= 0 && coord.z < this.terrain.gridSize.z );

	}

	async dispose() {

		this.terrain.remove(this.debugWireframe);

		if ( this.mesh ) {
			// TODO fix clean up
			this.terrain.remove(this.mesh)
			this.mesh.geometry.dispose();
			this.mesh = undefined;
			this.meshObjs.buffer.dispose();
		}

		if ( this.meshTemp ) {
			this.terrain.remove(this.meshTemp);
			this.meshTemp.geometry.dispose();
			this.meshTemp = undefined;
			this.meshTempObjs.buffer.dispose();
		}

	}

}
