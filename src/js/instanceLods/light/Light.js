import CachedInstancedLOD from '../cached/CachedInstancedLOD';
import { modelBank } from '../../modelloader/ModelLoader';
import { Mesh } from 'three';

export default class Light extends CachedInstancedLOD {

	constructor( terrain, viewDistance ) {

		super();
		this.terrain = terrain;
		this.viewDistance = viewDistance;
		this.loadObjects();
		app.scene.add( this );

	}

	animate( delta ) {

	}

	addObjects( models ) {

		if ( models.lightModel ) {

			this.addLevel( models.lightModel, 100000, 0 );

		}

	}

	loadObjects() {

		const models = {};

		models.lightModel = this.getModel();

		this.addObjects( models );

	}

	getModel() {
		const geo = new THREE.OctahedronGeometry(1, 0);

		const lightMaterial = new THREE.MeshLambertMaterial( {
			color: 0x049ef4
		} );
		
		lightMaterial.needsUpdate = true;

		const mesh = new THREE.Mesh(
			geo,
			lightMaterial
		);

		return mesh;
	}

	generateData( chunk ) {

	}

}
