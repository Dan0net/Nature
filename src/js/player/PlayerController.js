import BuildMarker from './BuildMarker';
import { modelBank } from '../modelloader/ModelLoader';
import * as THREE from 'three';
import BuildPresets from './BuildPresets';

const _PI_2 = Math.PI / 2;

export default class Player extends THREE.Object3D {

	constructor() {

		//create camera
		super();
		this.rotation.order = "YXZ";
		this.frustumCulled = false;

		this.cameraRigPosition = new THREE.Vector3( 0, 2.05, 0 );
		this.cameraRig = new THREE.Object3D();
		this.cameraRig.position.y += 1.05;
		this.cameraRig.rotation.order = "YXZ";
		this.camera = new THREE.PerspectiveCamera(
			70,
			window.innerWidth / window.innerHeight,
			0.1,
			10000
		);
		this.camera.position.x += 1;
		this.camera.position.y += 1;
		this.camera.position.z += 5.5;
		this.camera.lookAt( new THREE.Vector3( 1.5, 1.4, - 4 ) );

		this.cameraOriginalDistance = this.camera.position.length();
		this.cameraMaxDistance = this.camera.position.length();
		this.cameraDistance = this.cameraMaxDistance;
		this.cameraEuler = new THREE.Euler(0, 0, 0, 'YXZ');
		this.maxCameraPolarAngle = Math.PI;
		this.minCameraPolarAngle = 0;

		this.cameraRig.add( this.camera );
		this.add( this.cameraRig );

		//raycast point
		this.intersectPoint = null;

		// grabbing / eating / crystal & berry amounts
		this.crystals = 0;
		this.berries = 0;
		this.food = [ 0, 0, 0 ];
		this.sprint = 0;
		this.grabbing = false;

		//brush vars
		this.terrainAdjustStrength = 1;
		this.buildTimer = 0;
		this.maxBuildTime = 0.05;
		this.maxBuildDistance = 5;
		this.buildRotation = 0;
		this.buildPlaceTrigger = true;


		//player height/movement vars
		this.height = 1.9;
		this.walkSpeed = 10;
		this.sprintSpeedMultiplier = 2.2; //4
		this.walkSlopeLimit = 1.2;
		this.vDown = 0.0;
		this.gravity = 1.5;
		this.jumpStrength = 0.55;
		this.bouncyness = 0.1;
		this.defaultMouseSensitivity = 0.0016;
		this.mouseSensitivity = 0.0016;
		this.grounded = true;

		//flymode selector
		this.flyMode = false;
		this.godMode = false;

		//build marker
		this.buildMarker = new BuildMarker();
		this.buildPreset = 0;
		this.buildConfiguration = Object.assign({}, BuildPresets[0])
		this.buildMaterial = 0;
		this.maxBuildMaterials = 4;
		this.buildSnap = false;
	}

	eat() {

		if ( this.berries == 0 ) return;

		for ( let i = 0; i < this.food.length; i ++ ) {

			if ( this.food[ i ] == 0 ) {

				this.food[ i ] = 1;
				this.berries --;
				break;

			}

		}

		app.uiController.updateFoodDisplay();
		app.uiController.updateBerryDisplay();

	}


	//    o8o               o8o      .
	//    `"'               `"'    .o8
	//   oooo  ooo. .oo.   oooo  .o888oo
	//   `888  `888P"Y88b  `888    888
	//    888   888   888   888    888
	//    888   888   888   888    888 .
	//   o888o o888o o888o o888o   "888"

	init( startChunk, resolve ) {

		let x = ( startChunk.offset.x * startChunk.terrain.chunkSize ) + startChunk.terrain.chunkSize / 2;
		let z = ( startChunk.offset.z * startChunk.terrain.chunkSize ) + startChunk.terrain.chunkSize / 2;
		let m = Math.floor( app.terrainController.gridSize.x / 2 );
		let y = startChunk.getTerrainHeight( m, m ) * app.terrainController.terrainScale.y * 1.2;
		this.position.set( x, y, z );

		this.minDigDistance = this.brushRadius * app.terrainController.terrainScale.x * 0.225;

		if ( ! this.model ) {

			this.model = modelBank.knight;
			this.model.mixer = new THREE.AnimationMixer( this.model );
			this.model.animations = {
				idle: this.model.mixer.clipAction( this.model.animations[ 0 ] ),
				running: this.model.mixer.clipAction( this.model.animations[ 1 ] )
			};
			this.model.animations.idle.play();

			for ( let child of this.model.children ) {

				child.frustumCulled = false;

			}

			this.model.children[ 1 ].material.metalness = 0.0;
			this.model.children[ 1 ].material.roughness = 0.85;
			this.model.children[ 1 ].material.normalMap = new THREE.TextureLoader()
				.load( './resources/models/knight/n.png' );
			this.model.scale.multiplyScalar( this.height * 0.9 );
			this.model.position.y -= this.height;
			this.model.rotation.order = "YXZ";
			this.model.rotation.y = Math.PI;

			this.add( this.model );



			//add shadowlight. This position is updated in the update function
			this.shadowLightIntensity = 0.57;
			this.shadowLightOffset = new THREE.Vector3( 30, 80, 0 ).multiplyScalar( 5 );
			this.shadowLight = new THREE.DirectionalLight( 0xffffff, this.shadowLightIntensity );
			this.shadowLight.target = new THREE.Object3D();
			app.scene.add( this.shadowLight.target );

			this.shadowLight.position.copy( this.position ).add( this.shadowLightOffset );
			this.shadowLight.target.position.copy( this.position );

			this.defaultShadowLightFar = 800;
			this.shadowLight.castShadow = true;
			this.shadowLight.shadow.mapSize.width = 1024;
			this.shadowLight.shadow.mapSize.height = 1024;
			this.shadowLight.shadow.camera.near = 1;
			this.shadowLight.shadow.camera.far = this.defaultShadowLightFar;
			this.shadowLight.shadow.camera.top = - 1000;
			this.shadowLight.shadow.camera.bottom = 1000;
			this.shadowLight.shadow.camera.left = - 1000;
			this.shadowLight.shadow.camera.right = 1000;
			this.shadowLight.shadow.bias = - 0.002;
			app.scene.add( this.shadowLight );
			this.cameraTimer = 0;



			//add a skybox. This position is updated in the update function
			this.skyBox = new THREE.Mesh(
				new THREE.SphereGeometry(
					startChunk.terrain.chunkSize * 2 * Math.min( startChunk.terrain.viewDistance + 2, 14 ),
					64,
					64
				),
				new THREE.MeshBasicMaterial( {
					map: new THREE.TextureLoader().load( './resources/images/background.jpg' ),
					side: THREE.BackSide
				} )
			);
			this.skyBox.material.map.mapping = THREE.EquirectangularRefractionMapping;
			this.skyBox.material.map.encoding = THREE.sRGBEncoding;

			app.scene.add( this.skyBox );

			app.scene.add(this.buildMarker);
			this.buildMarker.visible = false;
		}

		resolve();

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

		const keyInputVector = this.getKeyInput( delta );

		this.movePlayer( keyInputVector, delta );

		this.model.mixer.update( delta );

		this.getCameraIntersect();

		//timer for adjusting terrain
		this.adjustTerrain( delta, mouseIsPressed );

		this.moveSkyboxAndLight();

		this.updateFood( delta );

		this.updateSprinting( keyInputVector, delta );

	}

	updateCameraCollision() {

		let v = new THREE.Vector3();
		this.camera.getWorldDirection( v );
		v.multiplyScalar( - 1 );

		this.cameraDistance = Math.min( this.cameraDistance + ( this.cameraMaxDistance - this.cameraDistance ) * 0.4, this.cameraMaxDistance );

		this.camera.position.setLength( this.cameraDistance );
		this.model.visible = this.cameraDistance > 2;

	}

	moveSkyboxAndLight() {

		//move skybox along with the object/camera
		this.skyBox.position.copy( this.position );
		this.skyBox.position.y *= 0.4;
		this.skyBox.rotation.x += 0.00004;

		if ( ++ this.cameraTimer > 200 ) {

			this.shadowLight.position.copy( this.position ).add( this.shadowLightOffset );
			this.shadowLight.target.position.copy( this.position );
			this.cameraTimer = 0;

		}

	}

	updateFood( delta ) {

		let foodUpdated = false;
		for ( let i = 0; i < this.food.length; i ++ ) {

			if ( this.food[ i ] > 0 ) {

				this.food[ i ] = Math.max( this.food[ i ] - ( delta * random( 0.01, 0.012 ) ), 0 );
				foodUpdated = true;

			}

		}

		if ( foodUpdated ) app.uiController.updateFoodDisplay();

	}

	updateSprinting( keyInputVector, delta ) {

		const food = this.food.reduce( ( acc, val ) => val > 0 ? acc + 1 : acc, 0 );

		if ( keyIsDown( app.key.shift ) && keyInputVector.length() > 0 ) {

			const amount = map( food, 0, 3, 0.1, 0.012 );
			this.sprint = Math.min( this.sprint + ( delta * amount ), 1 );

		} else {

			const amount = map( food, 0, 3, 0.15, 0.35 );
			this.sprint = Math.max( this.sprint - ( delta * amount ), 0 );

		}

		app.uiController.updateSprintDisplay();

	}









	// ooo. .oo.  .oo.    .ooooo.  oooo    ooo  .ooooo.
	// `888P"Y88bP"Y88b  d88' `88b  `88.  .8'  d88' `88b
	//  888   888   888  888   888   `88..8'   888ooo888
	//  888   888   888  888   888    `888'    888    .o
	// o888o o888o o888o `Y8bod8P'     `8'     `Y8bod8P'



	//            oooo
	//            `888
	// oo.ooooo.   888   .oooo.   oooo    ooo  .ooooo.  oooo d8b
	//  888' `88b  888  `P  )88b   `88.  .8'  d88' `88b `888""8P
	//  888   888  888   .oP"888    `88..8'   888ooo888  888
	//  888   888  888  d8(  888     `888'    888    .o  888
	//  888bod8P' o888o `Y888""8o     .8'     `Y8bod8P' d888b
	//  888                       .o..P'
	// o888o                      `Y8P'

	movePlayer( keyInputVector, delta ) {

		return new Promise( resolve => {

			//get cameraDirection (player aim direction);
			let playerEuler = new THREE.Euler( 0, this.cameraRig.rotation.y, 0, 'YXZ' );

			//get keyinput and rotate to camera direction (y axis rotation )
			let walkDirection = keyInputVector.clone().applyEuler( playerEuler );

			if ( walkDirection.length() > 0 ) {

				if ( walkDirection.x != 0 && walkDirection.z != 0 ) {

					let fEuler = new THREE.Euler( 0, this.model.rotation.y, 0, 'YXZ' );
					let fDirection = new THREE.Vector3( 0, 0, 1 ).applyEuler( fEuler );
					fDirection.lerp( walkDirection, 0.5 );

					let v = this.position
						.clone()
						.add( fDirection );
					v.y *= - 1;

					this.model.lookAt( v );

				}

				this.model.animations.running.play();
				this.model.animations.idle.stop();

				if ( keyIsDown( app.key.shift ) ) {

					this.model.animations.running.timeScale = 1.25;

				} else {

					this.model.animations.running.timeScale = 1.0;

				}

				this.updateCameraCollision();

			} else {

				this.model.animations.idle.play();
				this.model.animations.running.stop();

			}

			//the new position
			let nPos = this.position.clone();
			nPos.add( walkDirection );


			if ( this.godMode == false ) {

				//get the collisions for new position (down, up and in walkDirection )
				let collisions = this.terrainCollidePoint( nPos, walkDirection );

				if ( collisions.down.normal ) {

					//add gravity
					if ( this.flyMode == false ) nPos.y += this.vDown;

					if ( nPos.y > collisions.down.position.y + this.height ) {


						if ( this.flyMode == false ) {

							//fallingdown
							this.vDown -= this.gravity * delta;

						}
						this.grounded = false;


					} else {

						//climbing up terrain
						if ( this.flyMode == false ) {

							nPos.y = collisions.down.position.y + this.height;

						} else {

							nPos.y -= this.vDown;

							if ( abs( nPos.y - collisions.down.position.y ) < this.height * 1.5 ) {

								nPos.y = collisions.down.position.y + this.height * 1.5;

							}

						}
						this.grounded = true;

					}

				} else {

					nPos.copy( this.position );
					nPos.y += 0.1;
					this.vDown = this.gravity + 0.5;

				}

				//check pointing direction
				if ( collisions.direction.position ) {

					let d = this.position.distanceTo( collisions.direction.position );

					//if the angle is too steep, return to previous position
					if ( d < this.walkSlopeLimit ) {

						nPos.copy( this.position );

					}

				}

			}


			//set new position and gravity velocity
			this.position.copy( nPos );

			// console.log(this.position);
			resolve();

		} );

	}





	// oooo
	// `888
	//  888  oooo   .ooooo.  oooo    ooo
	//  888 .8P'   d88' `88b  `88.  .8'
	//  888888.    888ooo888   `88..8'
	//  888 `88b.  888    .o    `888'
	// o888o o888o `Y8bod8P'     .8'
	//                       .o..P'
	//                       `Y8P'
	//  o8o                                         .
	//  `"'                                       .o8
	// oooo  ooo. .oo.   oo.ooooo.  oooo  oooo  .o888oo
	// `888  `888P"Y88b   888' `88b `888  `888    888
	//  888   888   888   888   888  888   888    888
	//  888   888   888   888   888  888   888    888 .
	// o888o o888o o888o  888bod8P'  `V88V"V8P'   "888"
	//                    888
	//                   o888o

	keyPressed( e ) {
		console.log(e.code)
		if ( ! app.running ) return;

		if ( e.code == app.key.zoom ) app.zoom( true );
		if ( e.code == app.key.eat ) this.eat();
	    if ( e.code == app.key.escape ) app.stopGame();
		if ( e.code == app.key.grab ) this.grabbing = true;
		
		console.log(this.cameraMaxDistance)
		if ( e.code == app.key.viewMode ) this.cameraMaxDistance = (this.cameraMaxDistance !== this.cameraOriginalDistance ? this.cameraOriginalDistance : 0.01);
		if ( e.code == app.key.flyMode ) this.flyMode = !this.flyMode;

		if ( e.code == app.key.nextShape ) this.adjustBuildShape(1);
		if ( e.code == app.key.previousShape ) this.adjustBuildShape(-1);
		if ( e.code == app.key.nextMaterial ) this.adjustBuildMaterial(1);
		if ( e.code == app.key.previousMaterial ) this.adjustBuildMaterial(-1);
		if ( e.code == app.key.snapMode ) this.buildSnap = !this.buildSnap;

	}

	keyReleased( e ) {

		if ( ! app.running ) return;

		if ( e.code == app.key.zoom ) app.zoom( false );
		if ( e.code == app.key.grab ) this.grabbing = false;

	}

	getKeyInput( delta ) {

		let d = new THREE.Vector3();

		//x axis
		if ( keyIsDown( app.key.up ) ) {

			d.z -= 1;

		} else if ( keyIsDown( app.key.down ) ) {

			d.z += 1;

		}

		//z axis
		if ( keyIsDown( app.key.left ) ) {

			d.x -= 1;

		} else if ( keyIsDown( app.key.right ) ) {

			d.x += 1;

		}

		//y axis up
		if ( keyIsDown( app.key.space ) ) {

			if ( this.flyMode || this.godMode ) {

				//only position
				d.y += 1;

			} else {

				if ( this.grounded ) {

					//add to gravity vector
					d.y += this.jumpStrength;
					this.vDown = this.jumpStrength;

				}

			}

		}

		//shift key ( y axis down / sprinting )
		if ( this.flyMode == true || this.godMode == true ) {

			if ( keyIsDown( app.key.shift ) ) {

				//change position, no gravity
				d.y -= 1;

			}

			//set length to walkspeed * sprintspeed, in fly mode
			d.setLength( ( this.walkSpeed * delta ) * this.sprintSpeedMultiplier * 4 );

		} else {

			//set length to only walkspeed, in jetpack mode
			d.setLength( this.walkSpeed * delta );

			//add sprint only when shift key is pressed
			if ( keyIsDown( app.key.shift ) && this.sprint < 1 ) d.multiplyScalar( this.sprintSpeedMultiplier );

		}

		return d;

	}




	// ooo. .oo.  .oo.    .ooooo.  oooo  oooo   .oooo.o  .ooooo.
	// `888P"Y88bP"Y88b  d88' `88b `888  `888  d88(  "8 d88' `88b
	//  888   888   888  888   888  888   888  `"Y88b.  888ooo888
	//  888   888   888  888   888  888   888  o.  )88b 888    .o
	// o888o o888o o888o `Y8bod8P'  `V88V"V8P' 8""888P' `Y8bod8P'

	//  o8o                                         .
	//  `"'                                       .o8
	// oooo  ooo. .oo.   oo.ooooo.  oooo  oooo  .o888oo
	// `888  `888P"Y88b   888' `88b `888  `888    888
	//  888   888   888   888   888  888   888    888
	//  888   888   888   888   888  888   888    888 .
	// o888o o888o o888o  888bod8P'  `V88V"V8P'   "888"
	//                    888
	//                   o888o

	mouseMoved( e ) {

		if ( ! app.running ) return;

		this.cameraEuler.setFromQuaternion( this.cameraRig.quaternion );

		this.cameraEuler.y -= e.movementX * this.mouseSensitivity;
		this.cameraEuler.x -= e.movementY * this.mouseSensitivity;

		this.cameraEuler.x = Math.max( _PI_2 - this.maxCameraPolarAngle, Math.min( _PI_2 - this.minCameraPolarAngle, this.cameraEuler.x ) );

		this.cameraRig.quaternion.setFromEuler( this.cameraEuler );

		// //rotate object on Y
		// this.cameraRig.rotateY( e.movementX * - this.mouseSensitivity );

		// //rotate cameraRig on X
		// this.cameraRig.rotateX( e.movementY * - this.mouseSensitivity );

		// this.cameraRig.rotation.x = Math.min( this.cameraRig.rotation.x, 1.35 );
		// this.cameraRig.rotation.x = Math.max( this.cameraRig.rotation.x, - 1.1 );
		// this.cameraRig.rotation.z = 0;

		this.updateCameraCollision();

	}

	mouseWheel( e ) {

		if ( ! app.running ) return;
		e.preventDefault();

		// this.cameraMaxDistance += Math.sign( e.deltaY ) * 0.5;

		this.buildRotation = (this.buildRotation + (e.deltaY > 0 ? Math.PI / 8 : -Math.PI / 8)) % (Math.PI * 2);
		this.buildConfiguration.rotation.y = this.buildRotation;
		// if ( this.cameraMaxDistance < 0.01 ) this.cameraMaxDistance = 0.01;
		// if ( this.cameraMaxDistance > this.cameraOriginalDistance * 2 ) this.cameraMaxDistance = this.cameraOriginalDistance * 2;
		// this.updateCameraCollision();
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
	//     .                                          o8o
	//   .o8                                          `"'
	// .o888oo  .ooooo.  oooo d8b oooo d8b  .oooo.   oooo  ooo. .oo.
	//   888   d88' `88b `888""8P `888""8P `P  )88b  `888  `888P"Y88b
	//   888   888ooo888  888      888      .oP"888   888   888   888
	//   888 . 888    .o  888      888     d8(  888   888   888   888
	//   "888" `Y8bod8P' d888b    d888b    `Y888""8o o888o o888o o888o

	adjustBuildShape ( delta ) {
		this.buildPreset = (this.buildPreset + delta + BuildPresets.length) % BuildPresets.length;
		this.buildConfiguration = Object.assign({}, BuildPresets[this.buildPreset]);
		console.log(this.buildPreset, this.buildConfiguration)

	}

	adjustBuildMaterial ( delta ) {
		this.buildMaterial = (this.buildMaterial + delta + this.maxBuildMaterials) % this.maxBuildMaterials;
		this.buildConfiguration['material'] = this.buildMaterial;
		console.log(this.buildPreset, this.buildConfiguration)
	}




	adjustTerrain( delta, mouseIsPressed ) {

		const isPlacing = this.buildPlaceTrigger && mouseIsPressed;
		this.buildPlaceTrigger = !mouseIsPressed;
		// console.log(isPlacing, this.buildPlaceTrigger);

		// this.buildTimer > this.maxBuildTime &&
		// if ( app.terrainController.updating == false && this.intersectPoint && this.intersectPoint.object?.parent?.isVolumetricTerrain ) {
		let val = ( mouseButton == LEFT ) ? this.terrainAdjustStrength : - this.terrainAdjustStrength ;
		let center;
		if ( this.intersectPoint && this.intersectPoint.object?.parent?.isVolumetricTerrain ) {

			// if ( isPlacing) console.log('trying to place..')
			//exit if building too close by, or too far.
			// let d = this.intersectPoint.point.distanceTo( this.position );
			// if ( d > this.maxBuildDistance || ( mouseButton == RIGHT && d < this.minDigDistance ) ) return;

			// let val = ( mouseButton == LEFT ) ? - this.terrainAdjustStrength * delta : this.terrainAdjustStrength * delta;
			

			// if ( val < 0 ) {
			// 	this.intersectPoint.point.add(new THREE.Vector3(0, this.brushRadius, 0))
			// }

			// const buildBBox = this.buildConfiguration.size.clone().applyEuler(this.buildConfiguration.rotation)
			// console.log(this.intersectPoint.face.normal, buildBBox)
			// buildBBox.multiplyVectors(buildBBox, this.intersectPoint.face.normal)

			center = this.intersectPoint.point.clone().add(new THREE.Vector3(
				this.intersectPoint.face.normal.x,
				this.buildConfiguration.size.y/2,
				this.intersectPoint.face.normal.z
			))
			
			this.buildMarker.visible = true;
			this.buildMarker.position.copy( this.intersectPoint.point );
			// console.log(center)
			this.buildMarker.lookAt( center );
		} else {
			const direction = new THREE.Vector3();
			this.cameraRig.getWorldDirection(direction)

			// center = this.cameraRig.position.clone().add(direction.multiplyScalar(-this.maxBuildDistance));
			center = new THREE.Vector3(-3, 12, -3)
			console.log(center)
			this.buildMarker.visible = false;
		}

		//tell chunk to change the terrain
		//TODO move this to TerrainController
		// this.intersectPoint.object.chunk.adjust( center, this.buildConfiguration, val, true, !isPlacing );
		if ( this.buildSnap ) {
			center.round();
		}
		app.terrainController.build( center, this.buildConfiguration, val, !isPlacing );
		app.terrainController.updateInstancedObjects();

	}





	//                                                                 .
	//                                                               .o8
	// oooo d8b  .oooo.   oooo    ooo  .ooooo.   .oooo.    .oooo.o .o888oo  .ooooo.  oooo d8b
	// `888""8P `P  )88b   `88.  .8'  d88' `"Y8 `P  )88b  d88(  "8   888   d88' `88b `888""8P
	//  888      .oP"888    `88..8'   888        .oP"888  `"Y88b.    888   888ooo888  888
	//  888     d8(  888     `888'    888   .o8 d8(  888  o.  )88b   888 . 888    .o  888
	// d888b    `Y888""8o     .8'     `Y8bod8P' `Y888""8o 8""888P'   "888" `Y8bod8P' d888b
	//                    .o..P'
	//                    `Y8P'

	//  o8o                  .                                                       .    o8o
	//  `"'                .o8                                                     .o8    `"'
	// oooo  ooo. .oo.   .o888oo  .ooooo.  oooo d8b  .oooo.o  .ooooo.   .ooooo.  .o888oo oooo   .ooooo.  ooo. .oo.    .oooo.o
	// `888  `888P"Y88b    888   d88' `88b `888""8P d88(  "8 d88' `88b d88' `"Y8   888   `888  d88' `88b `888P"Y88b  d88(  "8
	//  888   888   888    888   888ooo888  888     `"Y88b.  888ooo888 888         888    888  888   888  888   888  `"Y88b.
	//  888   888   888    888 . 888    .o  888     o.  )88b 888    .o 888   .o8   888 .  888  888   888  888   888  o.  )88b
	// o888o o888o o888o   "888" `Y8bod8P' d888b    8""888P' `Y8bod8P' `Y8bod8P'   "888" o888o `Y8bod8P' o888o o888o 8""888P'

	getCameraIntersect() {

		app.raycaster.setFromCamera( new THREE.Vector2(), this.camera );

		let intersects = app.raycaster.intersectObjects( app.terrainController.castables, true );

		this.intersectPoint = null;

		if ( intersects.length > 0 ) {

			this.intersectPoint = intersects[ 0 ];

		}

	}

	terrainCollidePoint( point, direction ) {

		let response = {};

		//down
		let downNormal;
		let downPos = point.clone();
		downPos.y += this.height * 0.5 - this.vDown;

		app.raycaster.set( downPos, app.scene.down );
		let intersectDown = app.raycaster.intersectObjects( app.terrainController.castables, true );


		if ( intersectDown.length > 0 ) {

			downPos.y = intersectDown[ 0 ].point.y;
			downNormal = intersectDown[ 0 ].face?.normal || intersectDown[ 0 ].normal || undefined;

		} else {

			downPos.y = point.y;

		}
		response.down = { position: downPos, normal: downNormal };


		//direction
		let dirNormal;
		let dirPos = this.position.clone();

		app.raycaster.set( dirPos, direction.normalize() );
		let intersectdir = app.raycaster.intersectObjects( app.terrainController.castables );

		if ( intersectdir.length > 0 ) {

			dirPos = intersectdir[ 0 ].point;
			dirNormal = intersectdir[ 0 ].face.normal;

		} else {

			dirPos = undefined;

		}
		response.direction = { position: dirPos, normal: dirNormal };

		return response;

	}




	//           oooo                                oooo
	//           `888                                `888
	//  .ooooo.   888 .oo.   oooo  oooo  ooo. .oo.    888  oooo
	// d88' `"Y8  888P"Y88b  `888  `888  `888P"Y88b   888 .8P'
	// 888        888   888   888   888   888   888   888888.
	// 888   .o8  888   888   888   888   888   888   888 `88b.
	// `Y8bod8P' o888o o888o  `V88V"V8P' o888o o888o o888o o888o


	// oooo d8b  .oooo.   ooo. .oo.    .oooooooo  .ooooo.
	// `888""8P `P  )88b  `888P"Y88b  888' `88b  d88' `88b
	//  888      .oP"888   888   888  888   888  888ooo888
	//  888     d8(  888   888   888  `88bod8P'  888    .o
	// d888b    `Y888""8o o888o o888o `8oooooo.  `Y8bod8P'
	//                                d"     YD
	//                                "Y88888P'

	getChunkCoord( pos, chunkSize ) {

		return { x: Math.floor( pos.x / chunkSize ), z: Math.floor( pos.z / chunkSize ) };

	}








	// oooo d8b  .ooooo.  ooo. .oo.  .oo.    .ooooo.  oooo    ooo  .ooooo.
	// `888""8P d88' `88b `888P"Y88bP"Y88b  d88' `88b  `88.  .8'  d88' `88b
	//  888     888ooo888  888   888   888  888   888   `88..8'   888ooo888
	//  888     888    .o  888   888   888  888   888    `888'    888    .o
	// d888b    `Y8bod8P' o888o o888o o888o `Y8bod8P'     `8'     `Y8bod8P'

	remove() {

		this.model.geometry.dispose();
		this.model.material.dispose();

	}

}
