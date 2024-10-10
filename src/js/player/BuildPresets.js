import * as THREE from 'three';

export default [
    {
        name: 'light',
        shape: null,
        instanceModel: 'Light',
        lightValue: 1.0,
        constructive: true,
        size: new THREE.Vector3(2, 2, 2),
        material: 2,
        align: 'base',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.BoxGeometry( 1,1,1 ),
    },
    {
        name: 'wall',
        shape: 'cube',
        constructive: true,
        size: new THREE.Vector3(6, 6, 0.25),
        material: 2,
        align: 'base',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.BoxGeometry( 6, 6, 0.5 ),
    },
    {
        name: 'blob carve',
        shape: 'sphere',
        constructive: false,
        size: new THREE.Vector3(4, 0, 0),
        material: 1,
        align: 'center',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.SphereGeometry(2, 4, 4)
    },
    {
        name: 'blob',
        shape: 'sphere',
        constructive: true,
        size: new THREE.Vector3(4, 0, 0),
        material: 1,
        align: 'center',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.SphereGeometry(2, 4, 4)
    },
    {
        name: 'floor',
        shape: 'cube',
        constructive: true,
        size: new THREE.Vector3(4, 0.25, 4),
        material: 2,
        align: 'base',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.BoxGeometry( 4, 0.5, 4 )
    },
    {
        name: 'square window',
        shape: 'cube',
        constructive: false,
        size: new THREE.Vector3(1, 1, 4),
        material: 1,
        align: 'center',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.BoxGeometry(1, 1, 4)
    },
    {
        name: 'round window',
        shape: 'cylinder',
        constructive: false,
        size: new THREE.Vector3(1, 4, 0),
        material: 1,
        align: 'center',
        rotation: new THREE.Euler(Math.PI/2,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.CylinderGeometry(0.5, 0.5, 4, 8, 4)
    },
    {
        name: 'block',
        shape: 'cube',
        constructive: true,
        size: new THREE.Vector3(2, 2, 2),
        material: 0,
        align: 'base',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.BoxGeometry(2, 2, 2)
    },
    {
        name: 'big cylinder',
        shape: 'cylinder',
        constructive: true,
        size: new THREE.Vector3(8, 8, 0),
        material: 1,
        align: 'base',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.CylinderGeometry(4, 4, 8, 8, 4)
    },
    {
        name: 'small cylinder',
        shape: 'cylinder',
        constructive: true,
        size: new THREE.Vector3(1, 4, 0),
        material: 3,
        align: 'base',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.CylinderGeometry(0.5, 0.5, 4, 8, 4)
    }
]