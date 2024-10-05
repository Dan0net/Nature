import * as THREE from 'three';

export default [
    {
        shape: 'cube',
        size: new THREE.Vector3(4, 4, 0.5),
        material: 2,
        rotation: new THREE.Euler(0,0,0, 'XYZ')
    },
    {
        shape: 'cube',
        size: new THREE.Vector3(4, 0.5, 4),
        material: 2,
        rotation: new THREE.Euler(0,0,0, 'XYZ')
    },
    {
        shape: 'sphere',
        size: new THREE.Vector3(6, 0, 0),
        material: 1,
        rotation: new THREE.Euler(0,0,0, 'XYZ')
    }
]