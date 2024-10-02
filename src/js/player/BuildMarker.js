import VolumetricChunk from '../../libraries/volumetric-terrain/VolumetricChunk';
import WorkerBank from '../../libraries/workerbank/WorkerBank';
import * as THREE from 'three';
const CHUNK_OVERLAP = 2;

export default class BuildMarker extends THREE.Object3D {
    constructor() {
        super();

        const points = [];
        points.push( new THREE.Vector3( 0, 0, 0 ) );
        points.push( new THREE.Vector3( 0, 0, 4 ) );
        const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );

        const lineMaterial = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );

        const line = new THREE.Line( lineGeometry, lineMaterial );

        this.add( line );

        const curve = new THREE.EllipseCurve(
            0.0, 0.0,            // Center x, y
            2.0, 2.0,          // x radius, y radius
            0.0, 2.0 * Math.PI,  // Start angle, stop angle
          );
          
        const pts = curve.getSpacedPoints(32);
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const circleMaterial = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } ); 
        const circle = new THREE.LineLoop( geo, circleMaterial );
        
        this.add( circle );
    }
}