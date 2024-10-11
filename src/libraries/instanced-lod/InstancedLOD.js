import * as THREE from 'three';

export default class InstancedLOD extends THREE.Object3D {

	constructor() {

		super();
		this.levels = [];
		this.matrices = [];
		this.needsUpdate = false;
		this.dummy = new THREE.Object3D();

	}

	dispose() {

		for ( let child of this.children ) {

			child.geometry.dispose();
			child.material.dispose();
			this.remove( child );

		}

	}

	addLevel( object, amount, distance ) {

		let l;
		for ( l = 0; l < this.levels.length; l ++ ) {

			if ( distance < this.levels[ l ].distance ) {

				break;

			}

		}

		const instancedObjects = [];

		if ( object.children.length > 0 ) {

			for ( let child of object.children ) {

				const instancedObject = new THREE.InstancedMesh(
					child.geometry,
					child.material,
					amount
				);
				instancedObject.instanceMatrix.setUsage( THREE.DynamicDrawUsage );
				this.add( instancedObject );
				instancedObjects.push( instancedObject );

			}

		} else {

			const instancedObject = new THREE.InstancedMesh(
				object.geometry,
				object.material,
				amount
			);
			console.log('add instance obj')
			instancedObject.instanceMatrix.setUsage( THREE.DynamicDrawUsage );
			// instancedObject.frustumCulled = false;
			object.geometry.computeBoundingBox();
			this.add( instancedObject );
			
			instancedObjects.push( instancedObject );

		}

		this.levels.splice( l, 0, { distance, amount, object: instancedObjects } );

	}

	update( position ) {
		console.log(this.matrices);

		const levelCounts = new Array( this.levels.length ).fill( '' ).map( ()=>0 );

		for ( let matrix of this.matrices ) {

			if ( ! matrix ) continue;

			this.dummy.rotation.set( 0, 0, 0 );
			this.dummy.scale.setScalar( 0 );
			this.dummy.position.setScalar( 0 );
			this.dummy.applyMatrix4( matrix );
			const distance = this.dummy.position.distanceTo( position );

			for ( let i = 0; i < this.levels.length; i ++ ) {

				if ( ! this.levels[ i + 1 ] || distance < this.levels[ i + 1 ].distance ) {

					this._setMatrixAt( i, levelCounts[ i ] ++, matrix );
					break;

				}

			}

		}

		this.applyLevelCounts( levelCounts );
		this.updateInstancedObjectMatrices();

		this.needsUpdate = false;

	}

	applyLevelCounts( levelCounts ) {

		for ( let level = 0; level < this.levels.length; level ++ ) {

			for ( let instancedMesh of this.levels[ level ].object ) {

				instancedMesh.count = Math.min( this.levels[ level ].amount, levelCounts[ level ] );

			}

		}

	}

	_setMatrixAt( level, index, matrix ) {

		for ( let instancedMesh of this.levels[ level ].object ) {

			instancedMesh.setMatrixAt( index, matrix );

		}

	}

	clearData() {

		this.matrices = [];

	}

	setMatrices( matrices ) {

		this.matrices = matrices;

	}

	addMatrices( matrices ) {

		if (matrices){

			for ( let matrix of matrices ) {

				this.matrices.push( matrix );

			}
		}

	}

	updateInstancedObjectMatrices() {

		for ( let level = 0; level < this.levels.length; level ++ ) {

			for ( let instancedMesh of this.levels[ level ].object ) {

				instancedMesh.computeBoundingBox();
				instancedMesh.computeBoundingSphere();
				console.log(instancedMesh.boundingBox)
				console.log(instancedMesh.boundingSphere)
				const boxHelper = new THREE.Box3Helper(instancedMesh.boundingBox, 0xff0000);
				app.scene.add(boxHelper);
				instancedMesh.instanceMatrix.needsUpdate = true;

			}

		}

	}

}
