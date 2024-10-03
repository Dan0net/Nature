import * as THREE from 'three';

const CHUNK_OVERLAP = 2;

export default class VolumetricChunk {

	constructor( x, z, terrain, callback ) {

		//parent
		this.terrain = terrain;
		this.needsUpdate = false;

		//offset coordinates
		this.offset = { x, z };
		this.chunkKey = this.terrain.getChunkKey( this.offset );


		//terrain generation vars
		this.position = new THREE.Vector3(
			this.offset.x * ( this.terrain.gridSize.x - CHUNK_OVERLAP ) * this.terrain.terrainScale.x,
			0,
			this.offset.z * ( this.terrain.gridSize.z - CHUNK_OVERLAP ) * this.terrain.terrainScale.z
		);

		this.grid;
		this.gridTemp;
		this.useTemporaryGrid = false;
		this.terrainHeights;
		this.meshBuffer = {};

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

		this.dispose();

		if ( this.meshBuffer.mesh ) {

			if ( this.useTemporaryGrid ) {
				this.meshTemp = this.meshBuffer.mesh
			} else {
				this.mesh = this.meshBuffer.mesh
			}
		}

		if ( this.useTemporaryGrid ) {
			this.terrain.add( this.meshTemp );
			this.mesh.visible = false;
		} else {
			this.mesh.visible = true;
		}
		this.terrain.add( this.mesh );

		this.LODMesh = this.meshBuffer.LODMesh;
		this.meshBuffer = {};

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
					this.gridTemp = new Float32Array( data.grid );
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

		this.dispose();

		const {
			vertices,
			indices
		} = data;

		//create new geometry
		const geo = new THREE.BufferGeometry();

		geo.setIndex( new THREE.BufferAttribute( indices, 1 ) );
		geo.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
		geo.computeVertexNormals();

		//create new mesh with preloaded material
		this.meshBuffer.mesh = new THREE.Mesh( geo, this.terrain.material );
		this.meshBuffer.mesh.scale.set( this.terrain.terrainScale.x, this.terrain.terrainScale.y, this.terrain.terrainScale.z );
		this.meshBuffer.mesh.chunk = this;
		this.meshBuffer.mesh.position.x = this.position.x;
		this.meshBuffer.mesh.position.z = this.position.z;
		this.meshBuffer.mesh.material.needsUpdate = true;

		this.meshBuffer.mesh.updateWorldMatrix();
		this.meshBuffer.mesh.matrixAutoUpdate = false;

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


	adjust( center, radius, value, rot, checkNeighbors, useTemporaryGrid ) {
		
		// if ( this.terrain.updating !== false ) return;

		// if (!useTemporaryGrid) console.log('placing!');

		const localCenter = center.clone()
			.sub( this.mesh.position )
			.divide( this.terrain.terrainScale )
			// .round();

		this.useTemporaryGrid = useTemporaryGrid;
		if ( useTemporaryGrid ) {
			this.gridTemp = new Float32Array( this.grid );
		}

		this.adjustGrid( localCenter, radius, value, rot );

		if ( checkNeighbors ) this.adjustNeighbors( center, localCenter, radius, value, rot );
	}

	async adjustGrid( center, radius, val, rot ) {

		//square loop around a sphere brush
		let loopRadius = radius + 4;

		let p;
		let gridPosition = new THREE.Vector3();
		let pos = new THREE.Vector3();
		const centerRounded = center.clone().round()
		const eulerRot = new THREE.Euler(0, rot, 0, 'XYZ')

		for ( let y = - loopRadius; y <= loopRadius; y ++ ) {

			for ( let z = - loopRadius; z <= loopRadius; z ++ ) {

				for ( let x = - loopRadius; x <= loopRadius; x ++ ) {
					gridPosition.set( x, y, z ).add( centerRounded );

					if ( this.isInsideGrid( gridPosition ) ) {
						pos.set(x, y, z).add( centerRounded ).sub ( center )
						pos.applyEuler(eulerRot)						
						
						// pos.applyEuler(new THREE.Euler(0, rot, 0, 'XYZ'))
						// p = this.drawSphere( pos, radius );
						p = this.drawCube( pos, radius );
						// console.log(p);
						this.addScaleValueToGrid( gridPosition.x, gridPosition.y, gridPosition.z, val * p );
						if (p > 0) {
							this.saveGridPosition( gridPosition );
						}
					}

				}

			}

		}

		//put this chunk in the list of chunk that need updates
		this.needsUpdate = true;
	}

	drawSphere ( pos, radius ) {
		let d = pos.length();
		
		// TODO Fix sphere weight
		return map( d, 0, radius, 1, 0, true );
	}

	drawCube ( pos, radius ) {
		pos.set(Math.abs(pos.x), Math.abs(pos.y), Math.abs(pos.z))

		const q = pos.sub(new THREE.Vector3(radius, radius, 0.5))
		const outsideD = q.clone().max(new THREE.Vector3(0,0,0)).length();
		const insideD = Math.min( Math.max(q.x,q.y,q.z), 0.0);
  		const d = outsideD + insideD;

		// console.log(q, outsideD, insideD)

		// return d < 0 ? Math.inf : 0;
		// return d;
		return map( d, 0, 1, 1, 0, true );
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
	//                        o8o             oooo         .o8
	//                        `"'             `888        "888
	// ooo. .oo.    .ooooo.  oooo   .oooooooo  888 .oo.    888oooo.   .ooooo.  oooo d8b  .oooo.o
	// `888P"Y88b  d88' `88b `888  888' `88b   888P"Y88b   d88' `88b d88' `88b `888""8P d88(  "8
	//  888   888  888ooo888  888  888   888   888   888   888   888 888   888  888     `"Y88b.
	//  888   888  888    .o  888  `88bod8P'   888   888   888   888 888   888  888     o.  )88b
	// o888o o888o `Y8bod8P' o888o `8oooooo.  o888o o888o  `Y8bod8P' `Y8bod8P' d888b    8""888P'
	//                             d"     YD
	//                             "Y88888P'


	adjustNeighbors( center, localCenter, radius, val, rot ) {

		const extraMargin = 2;

		for (var i = -1; i <=1; i++){
			for (var j = -1; j <=1; j++){
				if (i ===0 && j === 0) continue;

				let nChunk = this.terrain.getChunkKey( { x: this.offset.x + i, z: this.offset.z + j } );
				const chunk = this.terrain.chunks[ nChunk ];

				if ( !chunk ) continue;

				if (
					( ( i > 0 ? this.terrain.gridSize.x : 0 ) + ( localCenter.x * -i ) - radius - extraMargin <= 0 ) &&
					( ( j > 0 ? this.terrain.gridSize.z : 0 ) + ( localCenter.z * -j ) - radius - extraMargin <= 0 )
				 ) {
					if ( true ) {
						chunk.adjust( center, radius, val, rot, false, this.useTemporaryGrid );
					}
				} else if ( chunk.useTemporaryGrid ) {
					console.log(chunk.chunkKey, 'flip off')
					chunk.useTemporaryGrid = false;
					chunk.flipMesh();
				}
			}
		}

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
		const oldValueScale = map( abs( this.grid[ gridOffset ] ), 0, 0.5, 0.001, 3 );
		const g = this.useTemporaryGrid ? this.gridTemp : this.grid;
		// return this.gridTemp[ gridOffset ] = constrain( this.grid[ gridOffset ] + ( val * oldValueScale ), - 0.5, 0.5 );
		const v = val + this.grid[ gridOffset ]
		// return g[ gridOffset ] = v > 0 ? Math.nan : v;
		// return g[ gridOffset ] = Math.max(val, this.grid[ gridOffset ]);
		// return g[ gridOffset ] = v;
		return g[ gridOffset ] = constrain( v, - 0.5, 0.5 );
		return g[ gridOffset ] = constrain( this.grid[ gridOffset ] + ( val * oldValueScale ), - 0.5, 0.5 );

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
			coord.y > 0 && coord.y < this.terrain.gridSize.y - 1 &&
			coord.z >= 0 && coord.z < this.terrain.gridSize.z );

	}

	async dispose() {

		if ( this.mesh ) {
			// TODO fix clean up
			// this.mesh.geometry.dispose();
			this.terrain.remove( this.mesh );
			// this.mesh = undefined;

		}

		if ( this.meshTemp ) {

			this.meshTemp.geometry.dispose();
			this.terrain.remove( this.meshTemp );
			this.meshTemp = undefined;

		}

	}

}
