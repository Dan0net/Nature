import VolumetricChunk from './VolumetricChunk';
import WorkerBank from '../workerbank/WorkerBank';
import * as THREE from 'three';
const CHUNK_OVERLAP = 2;
const apiUrl = import.meta.env.VITE_API_URL;

export default class VolumetricTerrain extends THREE.Object3D {

	constructor( options = {}, cb ) {

		super();

		this.isVolumetricTerrain = true;
		this.fps = options.fps || 20;

		this.currentCoord = options.currentCoord || { x: 0, y:0, z: 0 };
		this.chunks = {};
		this.chunkBuildQueue = {};
		this.castables = [];
		this.updating = false;

		this.gridSize = options.gridSize || { x: 16, y: 256, z: 16 };
		this.terrainScale = options.terrainScale || { x: 5, y: 5, z: 5 };
		this.viewDistance = options.viewDistance || 6;
		this.chunkSize = this.terrainScale.x * this.gridSize.x;
		this.chunkSizeOverlap = ( this.gridSize.x - CHUNK_OVERLAP ) * this.terrainScale.x;

		this.material = options.material || new THREE.MeshLambertMaterial( { color: 'rgb(100, 100, 100)' } );
		// this.materialTemp = options.material.clone() || new THREE.MeshLambertMaterial( { color: 'rgb(100, 100, 100)' } );
		// this.materialTemp.transparent = true;
		// this.materialTemp.opacity = 0.5;

		this.meshFactory = options.meshFactory || undefined;
		this.chunkClass = options.chunkClass || VolumetricChunk;

		const num_workers = options.workers || 4;
		this.gridWorkerBank = new WorkerBank( options.gridWorkerScript || new URL( './GridWorker.js', import.meta.url ), options.gridWorkerOptions || {}, num_workers );
		this.meshWorkerBank = new WorkerBank( options.meshWorkerScript || new URL( './MeshWorker.js', import.meta.url ), options.meshWorkerOptions || {}, num_workers );

		this.debugGeom = new THREE.BoxGeometry(1,1,1);

		this.debugMesh = new THREE.Mesh(
			this.debugGeom,
			new THREE.MeshBasicMaterial(0xff0000)
		);

		this.debugWireframe = new THREE.BoxHelper( 
			this.debugMesh, 
			0xffff00
		);
		this.add(this.debugWireframe)

		if ( cb ) {

			this.init()
				.then( ()=>{

					cb( this );

				} );

		}

	}

	toggleClock( start ) {

		if ( start ) {

			this.clock = setInterval( () => {

				this.update();

			}, 1000 / this.fps );

		} else {

			clearInterval( this.clock );

		}

	}

	clearChunks() {

		for ( let chunk in this.chunks ) {

			this.chunks[ chunk ].dispose();
		}
		this.chunks = {};

	}



	//  o8o               o8o      .
	//  `"'               `"'    .o8
	// oooo  ooo. .oo.   oooo  .o888oo
	// `888  `888P"Y88b  `888    888
	//  888   888   888   888    888
	//  888   888   888   888    888 .
	// o888o o888o o888o o888o   "888"

	init() {

		return new Promise( resolve =>{

			//init chunks
			this.clearChunks();

			let num_initial_chunks = 0;
			let LOAD_INITIAL_TERRAIN = async ( chunk ) => {
				
				this.chunks[ chunk.chunkKey ] = chunk;
				num_initial_chunks --;

				if ( num_initial_chunks == 0 ) resolve();

			};

			setTimeout( () => {

				const addChunks = [];
				for ( let x = - this.viewDistance; x <= this.viewDistance; x ++ ) {

					for ( let y = - this.viewDistance; y <= this.viewDistance; y ++ ) {

						for ( let z = - this.viewDistance; z <= this.viewDistance; z ++ ) {

							addChunks.push( {
								dist: x * x + y * y + z * z,
								add: () =>{

									new this.chunkClass(
										this.currentCoord.x + x,
										this.currentCoord.y + y,
										this.currentCoord.z + z,
										(y === this.viewDistance), // generate Sun if y is at top
										this,
										( chunk ) => LOAD_INITIAL_TERRAIN( chunk )
									);

								}
							} );

							num_initial_chunks ++;

						}

					}

				}

				for ( let chunk of addChunks.sort( ( a, b ) => a.dist - b.dist ) ) {

					chunk.add();

				}

			}, 10 );


		} );

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

	async update( position ) {

		if ( this.updating ) return;

		this.updating = true;

		//create array of promises
		let updatedChunk = false;
		const promises = [];

		const currentCoord = this.getCoordFromPosition( position );

		//update chunks after digging
		for ( let chunkKey of Object.keys( this.chunks ) ) {

			if ( this.chunks[ chunkKey ].needsUpdate === true ) {

				promises.push( this.chunks[ chunkKey ].update() );
				this.chunks[ chunkKey ].needsUpdate = false;
				updatedChunk = true;

			}

		}



		//create new chunks
		const buildKeys = Object.keys( this.chunkBuildQueue );
		if ( buildKeys.length > 0 ) {

			const chunkKey = buildKeys[ 0 ];
			if ( ! this.chunks[ chunkKey ] ) {

				promises.push( new Promise( ( resolve )=>{

					new this.chunkClass(
						this.chunkBuildQueue[ chunkKey ].x,
						this.chunkBuildQueue[ chunkKey ].y,
						this.chunkBuildQueue[ chunkKey ].z,
						false,
						this,
						chunk => {

							this.chunks[ chunkKey ] = chunk;
							resolve( chunkKey );

						}
					);

				} ) );

			}

			delete this.chunkBuildQueue[ chunkKey ];

		}


		await Promise.all( promises ).then( data => {

			if ( data.length > 0 ) {
				// console.log('flipping', data.length);

				for ( let chunkKey of data ) {

					this.chunks[ chunkKey ].flipMesh();

				}

			}

		} );

		if ( ! this.currentCoord ||
                updatedChunk === true ||
                this.currentCoord.x != currentCoord.x ||
                this.currentCoord.y != currentCoord.y ||
                this.currentCoord.z != currentCoord.z ) {

			this.updatecurrentCoord( currentCoord, ! updatedChunk );

		}

		// app.cubeCamera.position.copy(app.player.position)
		// app.cubeCamera.update(app.renderer, app.scene);

		this.updating = false;

	}

	updatecurrentCoord( currentCoord, newChunks ) {


		//updated after adjusting grid
		this.updateCastChunkTerrainArray( currentCoord );

		if ( newChunks ) {

			this.updateVisibleChunkTerrainArray( currentCoord );
			//update after changing coord
			this.currentCoord = currentCoord;

		}

	}








	//                          .     .oooooo.   oooo                                oooo
	//                        .o8    d8P'  `Y8b  `888                                `888
	//  .oooooooo  .ooooo.  .o888oo 888           888 .oo.   oooo  oooo  ooo. .oo.    888  oooo
	// 888' `88b  d88' `88b   888   888           888P"Y88b  `888  `888  `888P"Y88b   888 .8P'
	// 888   888  888ooo888   888   888           888   888   888   888   888   888   888888.
	// `88bod8P'  888    .o   888 . `88b    ooo   888   888   888   888   888   888   888 `88b.
	// `8oooooo.  `Y8bod8P'   "888"  `Y8bood8P'  o888o o888o  `V88V"V8P' o888o o888o o888o o888o
	// d"     YD
	// "Y88888P'
	getCoordFromPosition( position ) {

		return { 
			x: Math.floor( position.x / this.chunkSizeOverlap ), 
			y: Math.floor( position.y / this.chunkSizeOverlap ), 
			z: Math.floor( position.z / this.chunkSizeOverlap ) 
		};

	}
	getChunkKey( coord ) {

		return coord.x + ":" + coord.y + ":" + coord.z;

	}
	getChunk( key ) {

		return this.chunks[ key ];

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
	//              o8o            o8o   .o8       oooo
	//              `"'            `"'  "888       `888
	// oooo    ooo oooo   .oooo.o oooo   888oooo.   888   .ooooo.
	//  `88.  .8'  `888  d88(  "8 `888   d88' `88b  888  d88' `88b
	//   `88..8'    888  `"Y88b.   888   888   888  888  888ooo888
	//    `888'     888  o.  )88b  888   888   888  888  888    .o
	//     `8'     o888o 8""888P' o888o  `Y8bod8P' o888o `Y8bod8P'
	//           oooo                                oooo
	//           `888                                `888
	//  .ooooo.   888 .oo.   oooo  oooo  ooo. .oo.    888  oooo   .oooo.o
	// d88' `"Y8  888P"Y88b  `888  `888  `888P"Y88b   888 .8P'   d88(  "8
	// 888        888   888   888   888   888   888   888888.    `"Y88b.
	// 888   .o8  888   888   888   888   888   888   888 `88b.  o.  )88b
	// `Y8bod8P' o888o o888o  `V88V"V8P' o888o o888o o888o o888o 8""888P'
	updateVisibleChunkTerrainArray( currentCoord ) {

        	//new set of visible chunks
        	let newVisibleChunks = {};

        	//new chunk coordinate
        	for ( let x = - this.viewDistance; x <= this.viewDistance; x ++ ) {

        		for ( let y = - this.viewDistance; y <= this.viewDistance; y ++ ) {
					
					for ( let z = - this.viewDistance; z <= this.viewDistance; z ++ ) {

						let coord = { 
							x: currentCoord.x + x, 
							y: currentCoord.y + y, 
							z: currentCoord.z + z 
						};
						let chunkKey = this.getChunkKey( coord );


						//if chunk does not exist,
						//or it's low lod and if it's a farchunk:
						//add it to chunk generation queue
						if ( ! this.getChunk( chunkKey ) ) {

							this.chunkBuildQueue[ chunkKey ] = coord;

						}

						newVisibleChunks[ chunkKey ] = true;

					}

				}

        	}

        	//check existing chunks
        	for ( let key of Object.keys( this.chunks ) ) {

			//if this chunk is not needed in new visible chunks, hide it.
			if ( ! newVisibleChunks[ key ] ) {

				this.chunks[ key ].dispose();
        			delete this.chunks[ key ];

        		}

        	}

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
	//                                                                 .
	//                                                               .o8
	// oooo d8b  .oooo.   oooo    ooo  .ooooo.   .oooo.    .oooo.o .o888oo
	// `888""8P `P  )88b   `88.  .8'  d88' `"Y8 `P  )88b  d88(  "8   888
	//  888      .oP"888    `88..8'   888        .oP"888  `"Y88b.    888
	//  888     d8(  888     `888'    888   .o8 d8(  888  o.  )88b   888 .
	// d888b    `Y888""8o     .8'     `Y8bod8P' `Y888""8o 8""888P'   "888"
	//                    .o..P'
	//                    `Y8P'
	//           oooo                                oooo
	//           `888                                `888
	//  .ooooo.   888 .oo.   oooo  oooo  ooo. .oo.    888  oooo   .oooo.o
	// d88' `"Y8  888P"Y88b  `888  `888  `888P"Y88b   888 .8P'   d88(  "8
	// 888        888   888   888   888   888   888   888888.    `"Y88b.
	// 888   .o8  888   888   888   888   888   888   888 `88b.  o.  )88b
	// `Y8bod8P' o888o o888o  `V88V"V8P' o888o o888o o888o o888o 8""888P'
	updateCastChunkTerrainArray( currentCoord, castableObjects = [] ) {

		//new set of visible chunks
		let newcastables = {};

		//raycast chunk range
		let d = 1;
		for ( let x = - d; x <= d; x ++ ) {

			for ( let y = - d; y <= d; y ++ ) {

				for ( let z = - d; z <= d; z ++ ) {

					let chunkCoord = { 
						x: currentCoord.x + x, 
						y: currentCoord.y + y, 
						z: currentCoord.z + z 
					};
					let chunkKey = this.getChunkKey( chunkCoord );

					newcastables[ chunkKey ] = true;

				}

			}

		}

		this.castables = [];

		for ( let chunkKey in newcastables ) {

			let chunk = this.getChunk( chunkKey );
			let objects = castableObjects.map( castableObject => castableObject?.cachedData[ chunkKey ]?.mesh || castableObject );

			if ( chunk && chunk.mesh ) this.castables.push( chunk.mesh );
			if ( objects.length > 0 ) this.castables.push( ...objects );

		}

	}

	                                               
                                                              
	//                      88  88                                   
	//                      88  ""                            ,d     
	//                      88                                88     
	// ,adPPYYba,   ,adPPYb,88  88  88       88  ,adPPYba,  MM88MMM  
	// ""     `Y8  a8"    `Y88  88  88       88  I8[    ""    88     
	// ,adPPPPP88  8b       88  88  88       88   `"Y8ba,     88     
	// 88,    ,88  "8a,   ,d88  88  "8a,   ,a88  aa    ]8I    88,    
	// `"8bbdP"Y8   `"8bbdP"Y8  88   `"YbbdP'Y8  `"YbbdP"'    "Y888  
	//                         ,88                                   
	//                       888P"                                   
		
	adjust( center, extents, buildConfiguration, isTemporary ) {

		if ( isTemporary && this.updating !== false ) return;

		// TODO set any chunks not checked in loop to !useTemporaryGrid and flipMesh if they are
	
		// TODO simplify
		const {chunkCoord, chunkCenter} = this.getChunkCoordAndCenter( center );

		// console.log(centerChunkCoord)

		const extraMargin = 3;

		const extentsRound = extents.clone().ceil().addScalar(1.0)
		
		this.debugMesh.position.copy(center);
		this.debugMesh.scale.copy(extentsRound);
		this.debugWireframe.update();

		// for (var i = -2; i <=2; i++){
		// 	for (var j = -2; j <=2; j++){
		// 		for (var k = -2; k <=2; k++){
		for ( let key of Object.keys( this.chunks ) ) {

			// let nChunk = this.getChunkKey( { 
			// 	x: centerChunkCoord.x + i, 
			// 	y: centerChunkCoord.y + k, 
			// 	z: centerChunkCoord.z + j 
			// } );
			const chunk = this.chunks[ key ];

			const coordDiff = new THREE.Vector3(chunk.offset.x, chunk.offset.y, chunk.offset.z).sub(chunkCoord);

			// if ( !chunk ) continue;
			// console.log(nChunk)

			if (
				Math.abs(coordDiff.x) <= 1 &&
				Math.abs(coordDiff.y) <= 1 &&
				Math.abs(coordDiff.z) <= 1 &&
				( ( coordDiff.x > 0 ? this.gridSize.x : 0 ) + ( chunkCenter.x * -coordDiff.x ) - extentsRound.x - extraMargin <= 0 ) &&
				( ( coordDiff.y > 0 ? this.gridSize.y : 0 ) + ( chunkCenter.y * -coordDiff.y ) - extentsRound.y - extraMargin <= 0 ) &&
				( ( coordDiff.z > 0 ? this.gridSize.z : 0 ) + ( chunkCenter.z * -coordDiff.z ) - extentsRound.z - extraMargin <= 0 )
				) {
				if ( true ) {
					chunk.adjust( center, extentsRound, buildConfiguration, isTemporary );
				}
			} else if ( chunk.useTemporaryGrid ) {
				// console.log(chunk.chunkKey, 'flip off')
				chunk.useTemporaryGrid = false;
				chunk.flipMesh();
			}
		}
	}
	
	getChunkCoordAndCenter( center ) {
		const chunkCoord = new THREE.Vector3(
			center.x / ( this.gridSize.x - CHUNK_OVERLAP ) / this.terrainScale.x,
			center.y / ( this.gridSize.y - CHUNK_OVERLAP ) / this.terrainScale.y,
			center.z / ( this.gridSize.z - CHUNK_OVERLAP ) / this.terrainScale.z
		).floor();
		
		const centerChunkPosition = new THREE.Vector3(
			chunkCoord.x * ( this.gridSize.x - CHUNK_OVERLAP ) * this.terrainScale.x,
			chunkCoord.y * ( this.gridSize.y - CHUNK_OVERLAP ) * this.terrainScale.y,
			chunkCoord.z * ( this.gridSize.z - CHUNK_OVERLAP ) * this.terrainScale.z
		);

		const chunkCenter = center.clone().sub(centerChunkPosition).divide(this.terrainScale);
		
		return {chunkCoord, chunkCenter}
	}
																						
}