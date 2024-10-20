import VolumetricChunk from '../../libraries/volumetric-terrain/VolumetricChunk';
import WorkerBank from '../../libraries/workerbank/WorkerBank';
import * as THREE from 'three';
const CHUNK_OVERLAP = 2;

export default class BuildSnapMarker extends THREE.Object3D {
    constructor( snaps ) {
        super();
        
        this.snaps = snaps;
        this.markers = [];

        this.material = new THREE.MeshBasicMaterial( { color: 0xffff00, wireframe: true } ); 
        this.geometry = new THREE.SphereGeometry(0.5, 4, 4); 

        for(const snap of snaps ) {
            const sphere = this.generateSnapMarker(snap[0], snap[1], snap[2]);
            // console.log(snap, sphere)
            this.add( sphere );
            this.markers.push(sphere);
        }

    }
    generateSnapMarker(x, y, z) {
        const sphere = new THREE.Mesh( this.geometry, this.material );
        sphere.position.set(x, y, z);
        return sphere;
    }

    getMarkerWorldPositions() {
        const points = [];
        const p = new THREE.Vector3();

        for(const marker of this.markers ) {
            marker.getWorldPosition(p);
            points.push(p.clone());
        }

        return points;
    }

    storeSnaps( points ) {
        for(const p of points ) {
            const sphere = this.generateSnapMarker(p.x, p.y, p.z);
            app.scene.add(sphere);
        }
    }
}