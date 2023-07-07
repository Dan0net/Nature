//ChunkController

// import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js';
// // import {GLTFLoader} from 'https://threejsfundamentals.org/threejs/resources/threejs/r127/examples/jsm/loaders/GLTFLoader.js';

class ChunkController {

	constructor( callback ) {

		this.surfaceNetEngine = new SurfaceNets();
		this.chunks = {};
		this.updateChunks = {};
		this.createNewChunks = {};
		this.castChunks = [];
		this.prevCoord = undefined;
		this.initialTerrainCount = 197;
		this.chunkViewDistance = 10;
		this.farChunkEdge = 8;
		// this.initialTerrainCount = 149;
		// this.chunkViewDistance = 7;

		this.grassViewDistance = 4;
		this.fernViewDistance = 3;
		this.treeViewDistance = 16;

		this.deltaCountCreate = 0;
		this.deltaCountUpdate = 0;

		//preload material
		let rocktex = new THREE.TextureLoader().load( './resources/rock.jpg' );
		let grasstex = new THREE.TextureLoader().load( './resources/grass1.png' );
		// let rocktex = new THREE.TextureLoader().load( './resources/rocks/rocks_diff.png' );
		
		// let grasstex = new THREE.TextureLoader().load( './resources/grass/grass_diff.jpg' );
		// let clifftex = new THREE.TextureLoader().load( './resources/cliff/cliff_diff.png' );
		rocktex.anisotropy = 8;
		grasstex.anisotropy = 8;
		// clifftex.anisotropy = 8;
		




		this.terrainMaterial = new THREE.MeshLambertMaterial( {
			dithering: true,
			map: rocktex
		} );
		this.terrainMaterial.onBeforeCompile = ( shader ) => {
			
			shader.uniforms.tDiff = {
				value: [
					rocktex,
					grasstex
				]
			};

			shader.vertexShader = 'varying vec3 vPos;\nvarying vec3 vNormal;\n' + shader.vertexShader.replace(
				'#include <worldpos_vertex>',
				`
				#include <worldpos_vertex>
				vPos = vec3( worldPosition );
				vNormal = normal;
				`
			);

			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <map_pars_fragment>',
				`
				uniform sampler2D tDiff[2];
				varying vec3 vPos;
				varying vec3 vNormal;

				vec3 getTriPlanarBlend(vec3 _wNorm){
					// in wNorm is the world-space normal of the fragment

					vec3 blending = vec3( _wNorm );
					if ( blending.y < 0.0 ) blending.y = 0.0;
					blending = abs(blending);

					blending = normalize(max(blending, 0.00001)); // Force weights to sum to 1.0
					float b = (blending.x + blending.y + blending.z);
					blending /= vec3(b, b, b);
					return blending * blending;
				}

				vec4 getTriPlanarTexture(){
					float triRepeat = 0.016;

					vec3 blending = getTriPlanarBlend( vNormal );

					vec3 xaxis = texture2D( tDiff[0], mod(vPos.yz * triRepeat, 1.0) ).rgb;
					vec3 yaxis = texture2D( tDiff[1], mod(vPos.xz * triRepeat * 4.0, 1.0) ).rgb;
					vec3 zaxis = texture2D( tDiff[0], mod(vPos.xy * triRepeat, 1.0) ).rgb;

					return vec4( xaxis * blending.x + yaxis * blending.y + zaxis * blending.z * 0.9, 1.0 );
				}
				`
			)

			shader.fragmentShader = shader.fragmentShader.replace( '#include <map_fragment>',`` );

			shader.fragmentShader = shader.fragmentShader.replace( 
				'vec4 diffuseColor = vec4( diffuse, opacity );',
				`
				vec3 norm = normalize(vNormal);
				vec3 lightDir = normalize(vec3(1000.0, 1000.0, 0.0) - vPos);
				float diff = 0.7 + max(dot(norm, lightDir), 0.0) * 0.3;
				vec4 diffuseColor =  vec4( getTriPlanarTexture().rgb * diff, opacity );
				`			
			);

		};






		// this.cliffMaterial = new THREE.MeshLambertMaterial( {
		// 	dithering: true,
		// 	map: clifftex
		// } );
		// this.cliffMaterial.onBeforeCompile = ( shader ) => {

		// 	shader.uniforms.tDiff = {
		// 		value: [
		// 			clifftex,
		// 			clifftex
		// 		]
		// 	};

		// 	shader.vertexShader = 'varying vec3 vPos;\nvarying vec3 vNormal;\n' + shader.vertexShader.replace(
		// 		'#include <worldpos_vertex>',
		// 		`
		// 		#include <worldpos_vertex>
		// 		vPos = vec3( worldPosition );
		// 		vNormal = normal;
		// 		`
		// 	);

		// 	shader.fragmentShader = shader.fragmentShader.replace(
		// 		'#include <map_pars_fragment>',
		// 		`
		// 		uniform sampler2D tDiff[2];
		// 		varying vec3 vPos;
		// 		varying vec3 vNormal;

		// 		vec3 getTriPlanarBlend(vec3 _wNorm){
		// 			// in wNorm is the world-space normal of the fragment
		// 			vec3 blending = abs( _wNorm );
		// 			blending = normalize(max(blending, 0.00001)); // Force weights to sum to 1.0
		// 			float b = (blending.x + blending.y + blending.z);
		// 			blending /= vec3(b, b, b);
		// 			return abs(blending * blending);
		// 		}

		// 		vec4 getTriPlanarTexture(){
		// 			float triRepeat = 0.016;

		// 			vec3 blending = getTriPlanarBlend( vNormal );

		// 			vec3 xaxis = texture2D( tDiff[0], mod(vPos.yz * triRepeat, 1.0) ).rgb;
		// 			vec3 yaxis = texture2D( tDiff[1], mod(vPos.xz * triRepeat, 1.0) ).rgb;
		// 			vec3 zaxis = texture2D( tDiff[0], mod(vPos.xy * triRepeat, 1.0) ).rgb;

		// 			return vec4( xaxis * blending.x + yaxis * blending.y + zaxis * blending.z, 1.0 );
		// 		}
		// 		`
		// 	)

		// 	shader.fragmentShader = shader.fragmentShader.replace( '#include <map_fragment>',`` );

		// 	shader.fragmentShader = shader.fragmentShader.replace( 
		// 		'vec4 diffuseColor = vec4( diffuse, opacity );',
		// 		`vec4 diffuseColor = getTriPlanarTexture();`
		// 	);

		// };



		this.init()
			.then( ()=>{

				callback( this );

			} );

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

			//init chunks,
			let loadInitialTerrain = ( chunk ) => {

				this.chunks[ chunk.chunkKey ] = chunk;

				if ( Object.keys( this.chunks ).length == this.initialTerrainCount ) {

					//console.log( chunks );
					this.generateInstancedObjects();
					resolve();

				}

			};

			for ( let x = - this.chunkViewDistance - this.farChunkEdge; x <= this.chunkViewDistance + this.farChunkEdge; x ++ ) {

				for ( let z = - this.chunkViewDistance - this.farChunkEdge; z <= this.chunkViewDistance + this.farChunkEdge; z ++ ) {

					// let circle = ( x * x + z * z ) <= this.chunkViewDistance * this.chunkViewDistance;
					// if ( circle ) 
					new Chunk( x, z, this, loadInitialTerrain );

				}

			}

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
	update( delta ) {

		//update chunks after digging
		this.deltaCountUpdate += delta;
		if ( this.deltaCountUpdate >= 0.1 && Object.keys( this.updateChunks ).length > 0 ) {

			//create array of promises
			let promises = [];

			Object.keys( this.updateChunks ).forEach( chunk => {

				promises.push( this.chunks[ chunk ].update() );
				delete this.updateChunks[ chunk ];

			} );

			//run promises
			Promise.all( promises ).then( ()=>{

				this.updateCastChunkTerrainArray();
				if ( Object.keys( this.updateChunks ).length == 0 ){

					this.generateInstancedObjects();

				}
				

			} );

			this.deltaCountUpdate = 0;

		}

		//create new chunks
		this.deltaCountCreate += delta;
		if ( this.deltaCountCreate >= 0.02 && Object.keys( this.createNewChunks ).length > 0 ) {

			let chunkKey = Object.keys( this.createNewChunks )[ 0 ];
			if ( ! this.chunks[ chunkKey ] ) {

				let createChunk = new Promise( ( resolve )=>{

					this.chunks[ chunkKey ] = new Chunk(
						this.createNewChunks[ chunkKey ].x,
						this.createNewChunks[ chunkKey ].y,
						this,
						()=>{}
					);
					delete this.createNewChunks[ chunkKey ];

					resolve();

				} );

				//only load one promise
				createChunk.then( ()=>{

					this.updateCastChunkTerrainArray();
					if ( Object.keys( this.createNewChunks ).length == 0 ) {
						
						this.generateInstancedObjects();

					}

				} );

			}

			this.deltaCountCreate = 0;



		}

		if ( ! this.prevCoord ||
			this.prevCoord.x != player.currentChunkCoord.x ||
			this.prevCoord.y != player.currentChunkCoord.y ) {

			this.updateVisibleChunkTerrainArray();
			this.updateCastChunkTerrainArray();			
			this.prevCoord = player.currentChunkCoord.clone();
			this.generateInstancedObjects();

			//set birdsound volume
			let chunk = chunkController.chunks[ getChunkKey( this.prevCoord ) ];
			let treeAmount = chunk.modelMatrices[ 'tree' ].length + chunk.modelMatrices[ 'tree1' ].length;
			document.querySelector( 'audio' ).setVolume( map( treeAmount, 30, 110, 0.0, 0.3, true ), 2.5 );

		}

		//update fake-fog
		if ( this.fogCloud && this.fogCloud.material.userData.shader){
			this.fogCloud.material.userData.shader.uniforms.time.value += delta;			
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
	updateVisibleChunkTerrainArray() {

		//new set of visible chunks
		let newVisibleChunks = {};

		//new chunk coordinate
		for ( let x = - this.chunkViewDistance - this.farChunkEdge; x <= this.chunkViewDistance + this.farChunkEdge; x ++ ) {

			for ( let z = - this.chunkViewDistance - this.farChunkEdge; z <= this.chunkViewDistance + this.farChunkEdge; z ++ ) {

				let playerChunkCoord = { x: player.currentChunkCoord.x + x, y: player.currentChunkCoord.y + z };
				let chunkKey = getChunkKey( playerChunkCoord );

				
				//if chunk does not exist, 
				//or it's low lod and if it's a farchunk:
				//add it to chunk generation queue
				if ( ! this.chunks[ chunkKey ] ){

					this.createNewChunks[ chunkKey ] = playerChunkCoord;
					

				} else if  ( x > -this.chunkViewDistance && x < this.chunkViewDistance &&
							 z > -this.chunkViewDistance && z < this.chunkViewDistance ) {

					
					this.chunks[ chunkKey ].showLevel( 1 );
					

				} else {

					//store in visible chunks object
					this.chunks[ chunkKey ].showLevel( 0 );						

				}

				newVisibleChunks[ chunkKey ] = true;

			}

		}

		//check existing chunks
		Object.keys( this.chunks ).forEach( key=>{

			//if this chunk is not needed in new visible chunks, hide it.
			if ( ! newVisibleChunks[ this.chunks[ key ].chunkKey ]) {

				this.chunks[ key ].remove();
				delete this.chunks[ key ];

			}

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
	updateCastChunkTerrainArray() {

		//new set of visible chunks
		let newcastChunks = {};

		//new chunk coordinate
		let d = 2 //floor( this.chunkViewDistance / 4 );

		for ( let x = - d; x <= d; x ++ ) {

			for ( let z = - d; z <= d; z ++ ) {

				// if ( ( x * x + z * z ) >= d * d ) continue;

				let chunkCoord = { x: player.currentChunkCoord.x + x, y: player.currentChunkCoord.y + z };
				let chunkKey = getChunkKey( chunkCoord );

				newcastChunks[ chunkKey ] = true;

			}

		}

		this.castChunks = [];

		for ( let chunkKey in newcastChunks ) {

			let chunk = chunkController.getChunk( chunkKey );
			if ( chunk ) {
				this.castChunks.push( chunk.terrainMesh );
			}
		}

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

	generateInstancedObjects(){


		// for( let object in store.instancedObjects){

		// }
		this.generateGrass();
		this.generateFerns();
		this.generateTrees();
		this.generateFog();
		
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
	//  .oooooooo oooo d8b  .oooo.    .oooo.o  .oooo.o                                 
	// 888' `88b  `888""8P `P  )88b  d88(  "8 d88(  "8                                 
	// 888   888   888      .oP"888  `"Y88b.  `"Y88b.                                  
	// `88bod8P'   888     d8(  888  o.  )88b o.  )88b                                 
	// `8oooooo.  d888b    `Y888""8o 8""888P' 8""888P'                                 
	// d"     YD                                                                       
	// "Y88888P'                                                                    
	async generateGrass() {

		if ( ! this.grass ) {

			this.grass = [
				new THREE.InstancedMesh(
					grassModel1.geometry,
					grassModel1.material,
					100000
				),
				new THREE.InstancedMesh(
					grassModel2.geometry,
					grassModel2.material,
					15000
				),
				new THREE.InstancedMesh(
					grassModelHigh.geometry,
					grassModelHigh.material,
					15000
				)
			];
			this.grass[0].receiveShadow = true;
			this.grass[1].receiveShadow = true;
			this.grass[2].receiveShadow = true;

			scene.add( this.grass[0] );
			scene.add( this.grass[1] );
			scene.add( this.grass[2] );

		}

		let count0 = 0, count1 = 0, count2 = 0;
		for ( let x = - this.grassViewDistance; x <= this.grassViewDistance; x ++ ) {

			for ( let z = - this.grassViewDistance; z <= this.grassViewDistance; z ++ ) {

				let chunkCoord = { 
					x: ( player?.currentChunkCoord?.x || 0 ) + x, 
					y: ( player?.currentChunkCoord?.y || 0 ) + z, 
				};
				let chunkKey = getChunkKey( chunkCoord );

				if ( this.chunks[ chunkKey ] ) {

					let grassMatrices = this.chunks[ chunkKey ].getGrassMatrices();

					if ( Math.abs(x) <= 1 && Math.abs(z) <= 1){

						//high quality grass
						for ( let i = 0; i < grassMatrices[0].length; i ++, count2 ++ ) {

							this.grass[2].setMatrixAt( count2, grassMatrices[0][ i ] );
	
						}
	
					} else {

						for ( let i = 0; i < grassMatrices[0].length; i ++, count0 ++ ) {
	
							this.grass[0].setMatrixAt( count0, grassMatrices[0][ i ] );
	
						}
	
						for ( let i = 0; i < grassMatrices[1].length; i ++, count1 ++ ) {
	
							this.grass[1].setMatrixAt( count1, grassMatrices[1][ i ] );
	
						}

					}
					

				}

			}

		}

		this.grass[0].count = Math.min( count0, 100000 );
		this.grass[1].count = Math.min( count1, 15000 );
		this.grass[2].count = Math.min( count2, 15000 );

		this.grass[0].instanceMatrix.needsUpdate = true;
		this.grass[1].instanceMatrix.needsUpdate = true;
		this.grass[2].instanceMatrix.needsUpdate = true;

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
	                                                                                
	// oooooooooooo                                                                    
	// `888'     `8                                                                    
	//  888          .ooooo.  oooo d8b ooo. .oo.    .oooo.o                            
	//  888oooo8    d88' `88b `888""8P `888P"Y88b  d88(  "8                            
	//  888    "    888ooo888  888      888   888  `"Y88b.                             
	//  888         888    .o  888      888   888  o.  )88b                            
	// o888o        `Y8bod8P' d888b    o888o o888o 8""888P'                            
	async generateFerns() {

		// if ( this.grass ) scene.remove( this.grass );
		
		if ( ! this.ferns ) {

			this.ferns = new THREE.InstancedMesh(
				fernModel.geometry,
				fernModel.material,
				2500
			);

			scene.add( this.ferns );

		}

		let count = 0;
		for ( let x = - this.fernViewDistance; x <= this.fernViewDistance; x ++ ) {

			for ( let z = - this.fernViewDistance; z <= this.fernViewDistance; z ++ ) {

				let chunkCoord = { 
					x: ( player?.currentChunkCoord ) ? player.currentChunkCoord.x + x : x, 
					y: ( player?.currentChunkCoord ) ? player.currentChunkCoord.y + z : z, 
				};
				let chunkKey = getChunkKey( chunkCoord );

				if ( this.chunks[ chunkKey ] ) {

					let fernMatrices = this.chunks[ chunkKey ].getFernMatrices();
					for ( let i = 0; i < fernMatrices.length; i ++, count ++ ) {

						this.ferns.setMatrixAt( count, fernMatrices[ i ] );

					}

				}

			}

		}

		this.ferns.count = Math.min( count, 2500 );
		this.ferns.instanceMatrix.needsUpdate = true;

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
	                                                                                
	//  .o88o.                                                                         
	//  888 `"                                                                         
	// o888oo   .ooooo.   .oooooooo                                                    
	//  888    d88' `88b 888' `88b                                                     
	//  888    888   888 888   888                                                     
	//  888    888   888 `88bod8P'                                                     
	// o888o   `Y8bod8P' `8oooooo.                                                     
	//                   d"     YD                                                     
	//                   "Y88888P'                                                  
	generateFog(){
			
		if ( this.fogCloud ) {

			scene.remove( this.fogCloud );

		}

		let points = [];
		Object.keys( this.chunks ).map( key=>{
			points = [ ...points, ...this.chunks[ key ].getFogMatrices() ];
		})

		let fogGeo = new THREE.BufferGeometry().setFromPoints( points );
		let fogMat = new THREE.PointsMaterial({
			map: new THREE.TextureLoader().load('./resources/fog.png'),
			size: 500,
			transparent: true,
			opacity: 0.08,
			alphaTest: 0.015
		})
		fogMat.onBeforeCompile = ( shader ) => {
						
			shader.uniforms.time = { value: 0 };

			shader.vertexShader = 'uniform float time;\n' + 
				shader.vertexShader.replace(
					`#include <begin_vertex>`,
					`
					vec3 transformed = vec3( position );
					float r = rand( position.xz );

					if ( transformed.y > 0.5){
						transformed.x += sin( time * 0.008 * r ) * 250.0;
						transformed.y -= sin( time * 0.0013 * r) * 250.0;
						transformed.z += sin( time * 0.00734 * r) * 250.0;
					}
					`
				);

				fogMat.userData.shader = shader;

		};
		this.fogCloud = new THREE.Points( fogGeo, fogMat );		
		this.fogCloud.material.needsUpdate = true;
		scene.add( this.fogCloud );
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
	                                                                                
	//     .                                                                           
	//   .o8                                                                           
	// .o888oo oooo d8b  .ooooo.   .ooooo.   .oooo.o                                   
	//   888   `888""8P d88' `88b d88' `88b d88(  "8                                   
	//   888    888     888ooo888 888ooo888 `"Y88b.                                    
	//   888 .  888     888    .o 888    .o o.  )88b                                   
	//   "888" d888b    `Y8bod8P' `Y8bod8P' 8""888P'                                
	async generateTrees() {

		// if ( this.grass ) scene.remove( this.grass );
		
		if ( ! this.trees ) {

			this.trees = [
				new THREE.InstancedMesh(
					treeModel.geometry,
					treeModel.material,
					28000
				),
				new THREE.InstancedMesh(
					treeModel1.geometry,
					treeModel1.material,
					15000
				),
				new THREE.InstancedMesh( //high trunk
					treeModelHigh.children[0].geometry,
					treeModelHigh.children[0].material,
					1000
				),
				new THREE.InstancedMesh( //high leaves
					treeModelHigh.children[1].geometry,
					treeModelHigh.children[1].material,
					1000
				),
				new THREE.InstancedMesh( //high trunk2
					treeModelHigh2.children[0].geometry,
					treeModelHigh2.children[0].material,
					1000
				),
				new THREE.InstancedMesh( //high leaves2
					treeModelHigh2.children[1].geometry,
					treeModelHigh2.children[1].material,
					1000
				)
			];

			this.trees[0].material.alphaTest = 0.65;
			this.trees[0].material.needsUpdate = true;

			this.trees[1].material.alphaTest = 0.65;
			this.trees[1].material.needsUpdate = true;

			this.trees[3].material.alphaTest = 0.075;			
			this.trees[3].material.blending = THREE.NoBlending;
			this.trees[3].material.needsUpdate = true;

			this.trees[5].material.alphaTest = 0.075;
			this.trees[5].material.blending = THREE.NoBlending;
			this.trees[5].material.needsUpdate = true;
			
			this.trees[3].castShadow = true;
			this.trees[5].castShadow = true;

			scene.add( this.trees[0] );
			scene.add( this.trees[1] );
			scene.add( this.trees[2] );
			scene.add( this.trees[3] );
			scene.add( this.trees[4] );
			scene.add( this.trees[5] );

		}

		let t = new THREE.Matrix4();
		let count = [0,0,0,0];
		for ( let x = - this.treeViewDistance; x <= this.treeViewDistance; x ++ ) {

			for ( let z = - this.treeViewDistance; z <= this.treeViewDistance; z ++ ) {

				let chunkCoord = { 
					x: ( player?.currentChunkCoord ) ? player.currentChunkCoord.x + x : x, 
					y: ( player?.currentChunkCoord ) ? player.currentChunkCoord.y + z : z, 
				};
				let chunkKey = getChunkKey( chunkCoord );
				let playerPosition = ( x <= 1 && x >= -1) && ( z <= 1 && z >= -1 );

				if ( this.chunks[ chunkKey ] ) {

					let treeMatrices = this.chunks[ chunkKey ].getTreeMatrices();
					for(let m = 0; m < treeMatrices.length; m++){
						if ( !treeMatrices[ m ] ) continue;
						for ( let i = 0; i < treeMatrices[ m ].length; i ++, count[m] ++ ) {

							if ( playerPosition ){

								t.copy( treeMatrices[ m ][ i ] );
								t.scale( new THREE.Vector3( 0.06, 0.07, 0.06 ) );
								
								let nM = ( m==0 ) ? 2 : 4;
								this.trees[ nM ].setMatrixAt( count[m + 2], t );
								this.trees[ nM + 1 ].setMatrixAt( count[m + 2], t );
								count[m + 2]++								
								continue;
							}

							this.trees[ m ].setMatrixAt( count[m], treeMatrices[ m ][ i ] );

						}
					}

				}

			}

		}
		
		this.trees[0].count = Math.min( count[0], 28000 );
		this.trees[1].count = Math.min( count[1], 15000 );
		this.trees[2].count = Math.min( count[2], 1000 );
		this.trees[3].count = Math.min( count[2], 1000 );
		this.trees[4].count = Math.min( count[3], 1000 );
		this.trees[5].count = Math.min( count[3], 1000 );

		this.trees[0].instanceMatrix.needsUpdate = true;		
		this.trees[1].instanceMatrix.needsUpdate = true;
		this.trees[2].instanceMatrix.needsUpdate = true;
		this.trees[3].instanceMatrix.needsUpdate = true;
		this.trees[4].instanceMatrix.needsUpdate = true;
		this.trees[5].instanceMatrix.needsUpdate = true;

	}
}