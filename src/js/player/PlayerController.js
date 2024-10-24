import BuildMarker from './BuildMarker';
import { modelBank } from '../modelloader/ModelLoader';
import * as THREE from 'three';
import BuildPresets from './BuildPresets';
import BuildSnapMarker from './BuildSnapMarker';

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
		this.cameraMaxDistance = 0.01;
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
		this.buildTimer = 0;
		this.maxBuildTime = 0.05;
		this.maxBuildDistance = 30;
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

		//inventory
		this.inventoryVisible = false;

		//build marker
		this.buildMarker = new BuildMarker();
		this.buildPreset = 0;
		// this.buildConfiguration = Object.assign({}, BuildPresets[0])
		// this.buildConfiguration.needsUpdating = true;
		this.buildMaterial = 0;
		this.maxBuildMaterials = 6;
		this.buildCenterPrevious;
		this.buildInstanceModel;

		this.buildSnapMarker;
		this.buildSnapPoints = [];
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
				.load( '/models/knight/n.png' );
			this.model.scale.multiplyScalar( this.height * 0.9 );
			this.model.position.y -= this.height;
			this.model.rotation.order = "YXZ";
			this.model.rotation.y = Math.PI;

			this.add( this.model );

			this.cameraTimer = 0;

			//lights
			const skyColor = 0xB1E1FF;  // light blue
			const groundColor = 0xB97A20;  // brownish orange
			const Hintensity = 0.0;
			const Hlight = new THREE.HemisphereLight(skyColor, groundColor, Hintensity);
			app.scene.add(Hlight);

			const Dcolor = 0xFFFFFF;
			const Dintensity = 2.0;
			this.shadowLightOffset = new THREE.Vector3(-75, 100, 75);
			this.shadowLight = new THREE.DirectionalLight(Dcolor, Dintensity);
			this.shadowLight.position.copy(this.shadowLightOffset);
			this.shadowLight.target.position.set(0, 20, 0);
			this.shadowLight.castShadow = true;
			this.shadowLight.shadow.mapSize.width = 2048;
			this.shadowLight.shadow.mapSize.height = 2048;
			this.shadowLight.shadow.camera.zoom = 1;
			this.shadowLight.shadow.camera.blur = 4;
			this.shadowLight.shadow.camera.radius = 10;
			this.shadowLight.shadow.camera.left = -60
			this.shadowLight.shadow.camera.right = 60;
			this.shadowLight.shadow.camera.top = 60;
			this.shadowLight.shadow.camera.bottom = -60;
			// TODO fix bias with normal maps
			this.shadowLight.shadow.bias = 0.001;
			this.shadowLight.shadow.normalBias = 0.5;
			app.scene.add(this.shadowLight);
			// app.scene.add(this.shadowLight.target);

			const cameraHelper = new THREE.CameraHelper(this.shadowLight.shadow.camera);
			app.scene.add(cameraHelper);

			// build

			this.adjustBuildShape( 0 );

			app.scene.add(this.buildMarker);
			this.buildMarker.visible = false;

			this.buildWireframeMaterial = new THREE.LineBasicMaterial( { 
				color: 0xff0000
			 } );
	
			this.buildWireframe = new THREE.LineSegments( 
				this.buildWireframeGeometry, 
				this.buildWireframeMaterial 
			);
			app.scene.add(this.buildWireframe);

			this.debugGeom = new THREE.BoxGeometry(1,1,1);

			this.debugMesh = new THREE.Mesh(
				this.debugGeom,
				new THREE.MeshBasicMaterial(0xff0000)
			);

			this.debugWireframe = new THREE.BoxHelper( 
				this.debugMesh, 
				0xffff00
			);
			app.scene.add(this.debugWireframe)
		}

		this.updateCameraCollision();

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

		// this.moveSkyboxAndLight();

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
		// TODO move light

		//move skybox along with the object/camera
		// this.skyBox.position.copy( this.position );
		// this.skyBox.position.y *= 0.4;
		// this.skyBox.rotation.x += 0.00004;

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

					this.vDown -= this.gravity * delta;
					this.grounded = false;

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

			// console.log('player', this.position)

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
		
		// console.log(this.cameraMaxDistance)
		if ( e.code == app.key.viewMode ) {
			this.cameraMaxDistance = (this.cameraMaxDistance !== this.cameraOriginalDistance ? this.cameraOriginalDistance : 0.01);
			this.updateCameraCollision();
		}
		if ( e.code == app.key.flyMode ) this.flyMode = !this.flyMode;

		if ( e.code == app.key.nextShape ) this.adjustBuildShape(1);
		if ( e.code == app.key.previousShape ) this.adjustBuildShape(-1);
		if ( e.code == app.key.nextMaterial ) this.adjustBuildMaterial(1);
		if ( e.code == app.key.previousMaterial ) this.adjustBuildMaterial(-1);
		if ( e.code == app.key.snapMode ) this.buildConfiguration.gridSnap = !this.buildConfiguration.gridSnap
		
		if ( e.code == app.key.inventory ) app.uiController.updateInventoryDisplay();
		if ( e.code == app.key.slot1 ) app.uiController.updateInventorySlot(1);
		if ( e.code == app.key.slot2 ) app.uiController.updateInventorySlot(2);
		if ( e.code == app.key.slot3 ) app.uiController.updateInventorySlot(3);
		if ( e.code == app.key.slot4 ) app.uiController.updateInventorySlot(4);
		if ( e.code == app.key.slot5 ) app.uiController.updateInventorySlot(5);
		if ( e.code == app.key.slot6 ) app.uiController.updateInventorySlot(6);
		if ( e.code == app.key.slot7 ) app.uiController.updateInventorySlot(7);
		if ( e.code == app.key.slot8 ) app.uiController.updateInventorySlot(8);
		if ( e.code == app.key.slot9 ) app.uiController.updateInventorySlot(9);
		if ( e.code == app.key.slot0 ) app.uiController.updateInventorySlot(0);
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

		this.buildConfiguration.needsUpdating = true;

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

		this.buildConfiguration.needsUpdating = true;
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
		this.buildPreset = delta === 0 ? 0 : (this.buildPreset + delta + BuildPresets.length) % BuildPresets.length;
		this.buildConfiguration = Object.assign({}, BuildPresets[this.buildPreset]);
		// console.log(this.buildPreset, this.buildConfiguration)

		// instance model
		if (this.buildConfiguration.instanceModel) {
			this.buildInstanceModel = app.terrainController.instancedObjects[this.buildConfiguration.instanceModel].getModel();
			app.scene.add(this.buildInstanceModel);
		} else {
			if (this.buildInstanceModel) {
				app.scene.remove(this.buildInstanceModel);
				this.buildInstanceModel = null;
			}
			// update wireframe geom
			this.buildWireframeGeometry = new THREE.WireframeGeometry(
				this.buildConfiguration.wireframeGeometry
			)

			this.buildWireframe.geometry = this.buildWireframeGeometry
			this.buildWireframe.geometry.verticiesNeedUpdate = true;

			//update wireframe material
			this.buildWireframeMaterial.color.set(this.buildConfiguration.constructive ? 0x00FF00 : 0xFF0000);
			this.buildWireframeMaterial.needsUpdate = true;
		}

		if (this.buildSnapMarker) app.scene.remove(this.buildSnapMarker);
		this.buildSnapMarker = new BuildSnapMarker(this.buildConfiguration.snaps);
		app.scene.add(this.buildSnapMarker);

		// console.log(this.buildInstanceModel);

		this.buildConfiguration.needsUpdating = true;
	}

	adjustBuildMaterial ( delta ) {
		this.buildMaterial = (this.buildMaterial + delta + this.maxBuildMaterials) % this.maxBuildMaterials;
		this.buildConfiguration['material'] = this.buildMaterial;
		// console.log('material', this.buildMaterial);

		this.buildConfiguration.needsUpdating = true;
	}

	adjustTerrain( delta, mouseIsPressed ) {

		const isPlacing = this.buildPlaceTrigger && mouseIsPressed;
		this.buildPlaceTrigger = !mouseIsPressed;
		// console.log(isPlacing, this.buildPlaceTrigger);

		// this.buildTimer > this.maxBuildTime &&
		// if ( app.terrainController.updating == false && this.intersectPoint && this.intersectPoint.object?.parent?.isVolumetricTerrain ) {
		// let val = ( mouseButton == LEFT ) ? this.terrainAdjustStrength : - this.terrainAdjustStrength ;
		// this.buildWireframeMaterial.color.set(val ? 0x00FF00 : 0xFF0000);
		// this.buildWireframeMaterial.needsUpdate = true;

		let center;
		if ( this.intersectPoint && this.intersectPoint.object?.parent?.isVolumetricTerrain ) {
			center = this.intersectPoint.point.clone()
			
			this.buildMarker.visible = true;
			this.buildMarker.position.copy( this.intersectPoint.point );
			this.buildMarker.lookAt( center.clone().add(this.intersectPoint.normal) );
		} else {
			const v = new THREE.Vector3();
			const p = new THREE.Vector3();
			this.camera.getWorldDirection( v );
			this.camera.getWorldPosition( p )
			v.multiplyScalar( this.maxBuildDistance );

			center = p.add(v);
			
			this.buildMarker.visible = false;
		}
		this.buildWireframe.position.copy( center )

		if (   !this.buildCenterPrevious 
			|| this.buildConfiguration.needsUpdating
			|| !center.equals(this.buildCenterPrevious) 
			|| isPlacing){
			
			this.buildWireframe.scale.set(1,1,1);

			// apply build rotation
			// Step 1: Create a quaternion for the Y-axis rotation (world space)
			const yAxisQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.buildConfiguration.rotation.y + Math.PI);

			// Step 2: Create a quaternion for the X-axis rotation (local space)
			const xAxisQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.buildConfiguration.rotation.x);

			// Step 3: Combine the quaternions (apply world Y-axis first, then local X-axis)
			const baseQuaternion = new THREE.Quaternion().multiplyQuaternions(yAxisQuaternion, xAxisQuaternion);
			// const baseQuaternion = new THREE.Quaternion().setFromEuler(this.buildConfiguration.rotation);

			this.buildWireframe.quaternion.copy(xAxisQuaternion);
			// calc bbox for voxel range
			this.buildWireframe.geometry.computeBoundingBox();
			const bbox = new THREE.Box3();
			bbox.setFromObject(this.buildWireframe);
			const baseExtents = new THREE.Vector3(
				bbox.max.x - bbox.min.x,
				bbox.max.y - bbox.min.y,
				bbox.max.z - bbox.min.z,
			)

			this.buildWireframe.quaternion.copy(baseQuaternion);
			// calc bbox for voxel range
			this.buildWireframe.geometry.computeBoundingBox();
			// const bbox = new THREE.Box3();
			bbox.setFromObject(this.buildWireframe);
			const voxelExtents = new THREE.Vector3(
				bbox.max.x - bbox.min.x,
				bbox.max.y - bbox.min.y,
				bbox.max.z - bbox.min.z,
			)

			// if we touch terrain and need to fancy project the build obj
			if ( this.intersectPoint && this.buildConfiguration.align === 'base' ){
				// inverse rotate build mesh by build rotation and intersect normal
				const inverseNormal = new THREE.Vector3(-this.intersectPoint.normal.x, 0, -this.intersectPoint.normal.z).normalize()
				const forward = new THREE.Vector3(0, 0, 1);
				const normalQuaternion = new THREE.Quaternion().setFromUnitVectors(forward, inverseNormal);
				const tempQuaternion = new THREE.Quaternion().multiplyQuaternions(
					new THREE.Quaternion().multiplyQuaternions(yAxisQuaternion.clone().invert(), xAxisQuaternion), // similar to baseQuaternion, but only y axis rot inverted
					normalQuaternion
				);
				this.buildWireframe.quaternion.copy(tempQuaternion);
				
				// get this bbox to figre out offset
				this.buildWireframe.geometry.computeBoundingBox();
				bbox.setFromObject(this.buildWireframe);
				const extents = new THREE.Vector3(
					bbox.max.x - bbox.min.x,
					bbox.max.y - bbox.min.y,
					bbox.max.z - bbox.min.z,
				)

				if ( this.intersectPoint.normal.y < 0.25) {
					// if it's not a flat surface, project towards
					const offset = new THREE.Vector3(
						0,0,extents.z/2
					);
					
					const normalA = new THREE.Vector3(this.intersectPoint.normal.x, 0, this.intersectPoint.normal.z).normalize()

					const offsetQuarternion = new THREE.Quaternion().setFromUnitVectors(forward, normalA);
					offset.applyQuaternion(offsetQuarternion);
						
					// add to center
					center.add(offset);
				} else {
					// if it's a flat surface project away from player
					const offset = new THREE.Vector3(
						0,0,baseExtents.z/2
					);
					offset.applyQuaternion(yAxisQuaternion);
					center.add(offset);
				}

				// finally, move up to base level
				if ( this.buildConfiguration.align === 'base' ) {
					center.add(new THREE.Vector3(
						0,
						voxelExtents.y / 2,
						0
					))
				}

				//make build wireframe reflect build rotation
				this.buildWireframe.quaternion.copy(baseQuaternion);
			}

			// move build wireframe to actuall build spot
			// this.buildWireframe.scale.copy( new THREE.Vector3(1,1,1).multiplyScalar(this.buildConfiguration.constructive ? 1.2 : 1.0) )
			this.buildWireframe.position.copy( center )

			this.buildSnapMarker.quaternion.copy(baseQuaternion);
			this.buildSnapMarker.position.copy( center )

			const snapPoints = this.buildSnapMarker.getMarkerWorldPositions();
			let minSnapDistance = 0.75;
			let snapDelta;
			// TODO use partitioning or mathjs matrix ops
			for (const snapPoint of snapPoints) {
				for (const buildSnapPoint of this.buildSnapPoints) {
					const d = snapPoint.distanceTo(buildSnapPoint);
					// console.log(snapPoint, buildSnapPoint)
					// console.log(d)
					if (d < minSnapDistance) {
						minSnapDistance = d;
						snapDelta = snapPoint.sub(buildSnapPoint);
					}
				}
			}

			if (snapDelta) {
				center.sub(snapDelta);
				this.buildWireframe.position.copy( center )
				this.buildSnapMarker.position.copy( center )
			}

			if (this.buildConfiguration.instanceModel) {
				//update instance model placement
				this.buildInstanceModel.position.copy(center);
	
				app.terrainController.addInstance( center, voxelExtents, this.buildConfiguration, !isPlacing );
			} else {
				// tell chunk to change the terrain
				app.terrainController.adjust( center, voxelExtents, this.buildConfiguration, !isPlacing );
				if (isPlacing) {
					// app.terrainController.adjust( center, voxelExtents, this.buildConfiguration, !isPlacing );
					const snapPoints2 = this.buildSnapMarker.getMarkerWorldPositions();
					this.buildSnapMarker.storeSnaps(snapPoints2);
					this.buildSnapPoints = [...snapPoints2, ...this.buildSnapPoints];
					console.log(this.buildSnapPoints)
				}
				
				app.terrainController.updateInstancedObjects();
			}
			this.buildCenterPrevious = center;
			this.buildConfiguration.needsUpdating = false;
		}

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
