import VolumetricTerrain from '../../libraries/volumetric-terrain/VolumetricTerrain';
import terrainMaterial from './Material';
import terrainMaterialBasic from './MaterialBasic';
import terrainMaterial3D from './Material3D';
import Chunk from './Chunk';
import DB from './DB';

import Grass from '../instanceLods/grass/Grass';
import Trees from '../instanceLods/tree/Trees';
import Fern from '../instanceLods/fern/Fern';
import Fog from '../instanceLods/fog/Fog';
import Boulder from '../instanceLods/boulder/Boulder';
import Pedestal from '../instanceLods/pedestal/Pedestal';
import BerryBush from '../instanceLods/berry-bush/BerryBush';
import Light from '../instanceLods/light/Light';

// eslint-disable-next-line no-unused-vars
export default class TerrainController extends VolumetricTerrain {

	constructor( app, offset, viewDistance, saveProgress, seed, envmap, callback ) {

		super( {
			gridSize: { x: 32, y: 32, z: 32 },
			terrainScale: { x: .5, y: .5, z: .5 },
			currentCoord: offset,
			viewDistance: viewDistance.viewHigh + viewDistance.viewLow,
			fps: 24,
			material: terrainMaterial( envmap ),
			// material: terrainMaterialBasic,
			// material: terrainMaterial3D,
			workers: 1,
			// gridWorkerScript: './resources/js/gridworker/GridWorker.js',
			gridWorkerScript: './resources/js/gridworker/GridWorker-flat.js',
			// meshWorkerScript: './resources/js/meshworker/MeshWorker.js',
			meshWorkerScript: './resources/js/meshworker/MeshWorkerMultimat.js',
			gridWorkerOptions: { terrainSeed: seed },
			chunkClass: Chunk
		} );

		this.setDB( saveProgress );

		this.viewDistanceHigh = viewDistance.viewHigh;
		this.viewDistanceLow = viewDistance.viewLow;
		this.instancedObjectViewDistance = Math.min( this.viewDistance, 16 );
		this.grassViewDistance = Math.min( this.viewDistance, 6 );
		this.grassHighViewDistance = Math.min( this.viewDistance, 2 );
		this.fernViewDistance = Math.min( this.viewDistance, 3 );
		this.berryViewDistance = Math.min( this.viewDistance, 6 );
		this.fogViewDistance = Math.min( this.viewDistance, 6 );
		this.treeViewDistance = Math.min( this.viewDistance, 16 );
		this.treeHighViewDistance = Math.min( this.viewDistance, 4 );
		this.upperTreeHeightLimit = this.gridSize.y * this.terrainScale.y * 0.7;
		this.upperBoulderHeightLimit = this.gridSize.y * 0.55;

		this.instancedObjects = {
			"Light": new Light(this, this.grassViewDistance),
			// "Grass": new Grass( this, this.grassViewDistance ),
			// "Tree": new Trees( this, this.treeViewDistance ),
			// "Fern": new Fern( this, this.fernViewDistance ),
			// "BerryBush": new BerryBush( this, this.berryViewDistance ),
			// "Fog": new Fog( this, this.fogViewDistance ),
			// "Boulder": new Boulder( this, this.instancedObjectViewDistance ),
			// "Pedestal": new Pedestal( this, this.instancedObjectViewDistance )
		};

		this.init()
			.then( () => {

				this.updateCastChunkTerrainArray( this.currentCoord );
				// this.updateChunkLODs();
				callback( this );

			} );


	}

	clearChunks() {

		for ( let chunk in this.chunks ) {

			this.chunks[ chunk ].dispose();

		}
		this.chunks = {};

		for ( let instancedObject in this.instancedObjects ) {

			this.instancedObjects[ instancedObject ].dispose();

			if ( instancedObject == 'Tree' ) {

				app.scene.remove( this.instancedObjects[ instancedObject ].tree );
				app.scene.remove( this.instancedObjects[ instancedObject ].tree1 );

			} else {

				app.scene.remove( this.instancedObjects[ instancedObject ] );

			}

		}

	}


	setDB( set ) {

		this.DB = ( set == true ) ? new DB() : undefined;

	}

	//   o8o               o8o      .
	//   `"'               `"'    .o8
	//  oooo  ooo. .oo.   oooo  .o888oo
	//  `888  `888P"Y88b  `888    888
	//   888   888   888   888    888
	//   888   888   888   888    888 .
	//  o888o o888o o888o o888o   "888"
	init( viewDistance, saveProgress ) {

		if ( viewDistance ) {

			this.viewDistanceHigh = viewDistance.viewHigh;
			this.viewDistanceLow = viewDistance.viewLow;
			this.viewDistance = this.viewDistanceHigh + this.viewDistanceLow;

		}

		if ( saveProgress != undefined ) this.setDB( saveProgress );

		return new Promise( resolve =>{

			//reset chunks
			for ( let chunk of Object.keys( this.chunks ) ) {

				this.chunks[ chunk ].dispose();

			}
			this.chunks = {};

			const grid = app.uiController.elements.loadingGrid;
			app.uiController.elements.loadingText.textContent = `loading chunks`;

			let num_initial_chunks = 0;
			const LOAD_INITIAL_TERRAIN = async ( chunk ) => {

				this.chunks[ chunk.chunkKey ] = chunk;
				this.chunks[ chunk.chunkKey ].flipMesh();
				num_initial_chunks --;
				document.getElementById( chunk.chunkKey ).classList.add( 'active' );

				if ( num_initial_chunks == 0 ) {

					app.uiController.elements.loadingText.textContent = `loading player`;

					setTimeout( ()=>resolve(), 100 );

				}

			};

			const gridAmount = this.viewDistance * 2 + 1;
			grid.style.gridTemplateRows = `repeat(${gridAmount},calc(100% / ${gridAmount}))`;
			grid.style.gridTemplateColumns = `repeat(${gridAmount},calc(100% / ${gridAmount}))`;
			grid.innerHTML = '';


			setTimeout( () => {

				const addChunks = [];
				for ( let x = - this.viewDistance; x <= this.viewDistance; x ++ ) {

					for ( let y = - this.viewDistance; y <= this.viewDistance; y ++ ) {

						for ( let z = - this.viewDistance; z <= this.viewDistance; z ++ ) {

							addChunks.push( {
								dist: x * x + z * z,
								add: () =>{

									new this.chunkClass(
										this.currentCoord.x + x,
										this.currentCoord.y + y,
										this.currentCoord.z + z,
										this,
										( chunk ) => LOAD_INITIAL_TERRAIN( chunk )
									);

								}
							} );

							num_initial_chunks ++;

							const d = document.createElement( 'div' );
							d.id = `${this.currentCoord.x + x}:${this.currentCoord.y + y}:${this.currentCoord.z + z}`;
							d.className = 'loading-grid-item';
							grid.appendChild( d );

						}
					}

				}

				for ( let chunk of addChunks.sort( ( a, b ) => a.dist - b.dist ) ) {

					chunk.add();

				}

			}, 10 );


		} );

	}

	//                        o8o                                  .
	//                        `"'                                .o8
	//  .oooo.   ooo. .oo.   oooo  ooo. .oo.  .oo.    .oooo.   .o888oo  .ooooo.
	// `P  )88b  `888P"Y88b  `888  `888P"Y88bP"Y88b  `P  )88b    888   d88' `88b
	//  .oP"888   888   888   888   888   888   888   .oP"888    888   888ooo888
	// d8(  888   888   888   888   888   888   888  d8(  888    888 . 888    .o
	// `Y888""8o o888o o888o o888o o888o o888o o888o `Y888""8o   "888" `Y8bod8P'

	animate( delta ) {

		const keys = Object.keys( this.instancedObjects );
		for ( let key of keys ) {

			this.instancedObjects[ key ].animate( delta );

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
	async update() {

		super.update( app.player.position );

		// check if player is undergorund
		const chunkKey = this.getChunkKey( this.currentCoord );
		const chunk = this.chunks[ chunkKey ];
		if ( !chunk ) return;
		const gridPosition = app.player.position.clone()
			.sub( chunk.position )
			.divide( this.terrainScale )
			.round();
		const terrainHeight = chunk.getTerrainHeight( gridPosition.x, gridPosition.z );
		const underground = app.player.position.y < terrainHeight * this.terrainScale.y * 0.9;

		// mute bird sound
		if ( underground ) document.querySelector( 'audio' ).setVolume( 0, 1 );

		//render grey background in caves
		// app.player.skyBox.visible = ! underground;

		//lower light intensity
		// app.player.shadowLight.intensity = (
		// 	underground && app.player.shadowLight.intensity > 0
		// ) ? (
		// 		app.player.shadowLight.intensity - 0.1
		// 	) : (
		// 		( app.player.shadowLight.intensity < 1 && ! underground ) ? (
		// 			app.player.shadowLight.intensity + 0.1
		// 		) : (
		// 			app.player.shadowLight.intensity
		// 		)
		// 	);

		//lower exposure
		// app.renderer.toneMappingExposure = (
		// 	underground && app.renderer.toneMappingExposure > 1.5
		// ) ? (
		// 		app.renderer.toneMappingExposure - 0.1
		// 	) : (
		// 		( ! underground && app.renderer.toneMappingExposure < app.renderer.toneMappingExposureMax ) ? (
		// 			app.renderer.toneMappingExposure + 0.1
		// 		) : (
		// 			app.renderer.toneMappingExposure
		// 		)
		// 	);

	}

	updatecurrentCoord( currentCoord, newChunks ) {

		super.updatecurrentCoord( currentCoord, newChunks );
		this.updateInstancedObjects();

		if ( newChunks ) {

			// this.updateChunkLODs();
			this.updateInstancedObjects( true );

			const chunkKey = this.getChunkKey( this.currentCoord );
			// const treeAmount = ( this.instancedObjects.Tree.cachedData[ chunkKey ]?.tree.length || 0 );
			// const birdVolume = map( treeAmount, 3, 15, 0.0, 0.3, true );
			// document.querySelector( 'audio' ).setVolume( birdVolume, 2.5 );

		}

	}

	updateChunkLODs() {

		for ( let chunk in this.chunks ) {

			chunk = this.chunks[ chunk ];
			const x = Math.abs( this.currentCoord.x - chunk.offset.x );
			const z = Math.abs( this.currentCoord.z - chunk.offset.z );

			if ( x >= - this.viewDistance && x <= this.viewDistance &&
                  z >= - this.viewDistance && z <= this.viewDistance ) {

				chunk.showLevel( 1 );

			} else {

				chunk.showLevel( 0 );

			}

		}

	}

	updateInstancedObjects( force = false ) {
		let timer = 0;
		for ( let name of Object.keys( this.instancedObjects ) ) {

			if ( this.instancedObjects[ name ].needsUpdate || force ) {

				setTimeout( async () => {

					await this.updateInstancedObject( name );

				}, timer ++ * 100 );

			}

		}

	}

	updateInstancedObject( name ) {
		console.log('update instance', name)
		
		return new Promise( resolve => {

			// TODO figure out why cachedData is getting cleared for chunks
			const object = this.instancedObjects[ name ];
			object.clearData();

			const playerCoord = this.getCoordFromPosition( app.player.position );

			for ( let x = - object.viewDistance; x <= object.viewDistance; x ++ ) {
				for ( let y = - object.viewDistance; y <= object.viewDistance; y ++ ) {
					for ( let z = - object.viewDistance; z <= object.viewDistance; z ++ ) {

						const chunkCoord = {
							x: ( playerCoord?.x || 0 ) + x,
							y: ( playerCoord?.y || 0 ) + y,
							z: ( playerCoord?.z || 0 ) + z,
						};
						const key = this.getChunkKey( chunkCoord );
						// console.log(key, object.hasData( key ), object.cachedData[key])
						if ( object.hasData( key ) ) {
							// console.log('chunk data', name, chunkCoord)

							object.addCachedData( key );

						} else {
							// console.log('updateInstances cdata', name, chunkCoord)

							const chunk = this.chunks[ key ];
							if ( chunk && chunk.sampler ) object.addChunkData( chunk );
							// if ( chunk ) console.log('chunk ex')

						}


					}
				}

			}

			object.update( app.player.position );

			resolve();

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
	// 88                                                                                    
	// 88                            ,d                                                      
	// 88                            88                                                      
	// 88  8b,dPPYba,   ,adPPYba,  MM88MMM  ,adPPYYba,  8b,dPPYba,    ,adPPYba,   ,adPPYba,  
	// 88  88P'   `"8a  I8[    ""    88     ""     `Y8  88P'   `"8a  a8"     ""  a8P_____88  
	// 88  88       88   `"Y8ba,     88     ,adPPPPP88  88       88  8b          8PP"""""""  
	// 88  88       88  aa    ]8I    88,    88,    ,88  88       88  "8a,   ,aa  "8b,   ,aa  
	// 88  88       88  `"YbbdP"'    "Y888  `"8bbdP"Y8  88       88   `"Ybbd8"'   `"Ybbd8"'  
	
	addInstance( center, extents, buildConfiguration, isTemporary) {
		if (isTemporary) return;

		const {chunkCoord} = this.getChunkCoordAndCenter(center);
		const chunkKey = this.getChunkKey(chunkCoord);
		const chunk = this.getChunk(chunkKey);

		const dummy = new THREE.Object3D();
		dummy.position.copy( center );
		dummy.updateMatrix();
		// console.log(dummy.matrix);

		const instancedObject = this.instancedObjects[buildConfiguration.instanceModel]
		
		instancedObject.addDataToCache([dummy.matrix.clone()], chunkKey);

		instancedObject.update(app.player.position);

		// console.log(chunkCoord, chunkKey, chunk)

		chunk.addLight(center, 1.0);
	}

	//                              .o8                .               .oooooo.                          .
	//                             "888              .o8              d8P'  `Y8b                       .o8
	// oooo  oooo  oo.ooooo.   .oooo888   .oooo.   .o888oo  .ooooo.  888           .oooo.    .oooo.o .o888oo
	// `888  `888   888' `88b d88' `888  `P  )88b    888   d88' `88b 888          `P  )88b  d88(  "8   888
	//  888   888   888   888 888   888   .oP"888    888   888ooo888 888           .oP"888  `"Y88b.    888
	//  888   888   888   888 888   888  d8(  888    888 . 888    .o `88b    ooo  d8(  888  o.  )88b   888 .
	//  `V88V"V8P'  888bod8P' `Y8bod88P" `Y888""8o   "888" `Y8bod8P'  `Y8bood8P'  `Y888""8o 8""888P'   "888"
	//              888
	//             o888o
	//   .oooooo.   oooo                                oooo
	//  d8P'  `Y8b  `888                                `888
	// 888           888 .oo.   oooo  oooo  ooo. .oo.    888  oooo
	// 888           888P"Y88b  `888  `888  `888P"Y88b   888 .8P'
	// 888           888   888   888   888   888   888   888888.
	// `88b    ooo   888   888   888   888   888   888   888 `88b.
	//  `Y8bood8P'  o888o o888o  `V88V"V8P' o888o o888o o888o o888o
	// ooooooooooooo                                        o8o
	// 8'   888   `8                                        `"'
	//      888       .ooooo.  oooo d8b oooo d8b  .oooo.   oooo  ooo. .oo.
	//      888      d88' `88b `888""8P `888""8P `P  )88b  `888  `888P"Y88b
	//      888      888ooo888  888      888      .oP"888   888   888   888
	//      888      888    .o  888      888     d8(  888   888   888   888
	//     o888o     `Y8bod8P' d888b    d888b    `Y888""8o o888o o888o o888o
	//       .o.
	//      .888.
	//     .8"888.     oooo d8b oooo d8b  .oooo.   oooo    ooo
	//    .8' `888.    `888""8P `888""8P `P  )88b   `88.  .8'
	//   .88ooo8888.    888      888      .oP"888    `88..8'
	//  .8'     `888.   888      888     d8(  888     `888'
	// o88o     o8888o d888b    d888b    `Y888""8o     .8'
	//                                             .o..P'
	//                                             `Y8P'

	updateCastChunkTerrainArray( currentCoord ) { //adding boulders to castables

		if ( this.instancedObjects[ 'Boulder' ] && this.instancedObjects[ 'Pedestal' ] ) {

			super.updateCastChunkTerrainArray( currentCoord, [ this.instancedObjects[ 'Boulder' ], this.instancedObjects[ 'Pedestal' ] ] );

		} else {

			super.updateCastChunkTerrainArray( currentCoord );

		}

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
	//  o8o                           .                                                   .o8
	//  `"'                         .o8                                                  "888
	// oooo  ooo. .oo.    .oooo.o .o888oo  .oooo.   ooo. .oo.    .ooooo.   .ooooo.   .oooo888
	// `888  `888P"Y88b  d88(  "8   888   `P  )88b  `888P"Y88b  d88' `"Y8 d88' `88b d88' `888
	//  888   888   888  `"Y88b.    888    .oP"888   888   888  888       888ooo888 888   888
	//  888   888   888  o.  )88b   888 . d8(  888   888   888  888   .o8 888    .o 888   888
	// o888o o888o o888o 8""888P'   "888" `Y888""8o o888o o888o `Y8bod8P' `Y8bod8P' `Y8bod88P"
	//            .o8           o8o                         .
	//           "888           `"'                       .o8
	//  .ooooo.   888oooo.     oooo  .ooooo.   .ooooo.  .o888oo  .oooo.o
	// d88' `88b  d88' `88b    `888 d88' `88b d88' `"Y8   888   d88(  "8
	// 888   888  888   888     888 888ooo888 888         888   `"Y88b.
	// 888   888  888   888     888 888    .o 888   .o8   888 . o.  )88b
	// `Y8bod8P'  `Y8bod8P'     888 `Y8bod8P' `Y8bod8P'   "888" 8""888P'
	//                          888
	//                      .o. 88P
	//                      `Y888P
	adjustInstancedObjects( chunkKey, center, radius ) {

		const chunk = this.getChunk( chunkKey );
		// console.log(chunk, chunkKey, center)
		//todo unsure why chunk would be undefined
		if (!chunk) return;

		const point = chunk.position.clone().add( center.clone().multiply( this.terrainScale ) );

		for ( let key of Object.keys( this.instancedObjects ) ) {

			// this.instancedObjects[ key ].removeMatricesOnDistanceFromPoint( chunkKey, point, radius );

		}

	}

}
