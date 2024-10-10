import CachedInstancedLOD from '../cached/CachedInstancedLOD';
import { modelBank } from '../../modelloader/ModelLoader';

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
		// models.lightModel.geometry.translate( 0, - 0.051, 0 );
		// models.lightModel.geometry.scale( 1.45, 1.25, 1.45 );

		const lightMaterial = new THREE.MeshLambertMaterial( {
			color: 0x049ef4
		} );
		
		lightMaterial.needsUpdate = true;

		return new THREE.Mesh(
			geo,
			lightMaterial
		);
	}

	generateData( chunk ) {

	}

}
