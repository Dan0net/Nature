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
        snaps: [[0,0,0]],
    },
    {
        name: 'wall',
        shape: 'cube',
        constructive: true,
        size: new THREE.Vector3(4,4,0.5),
        material: 4,
        align: 'base',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.BoxGeometry( 4,4,0.5 ),
        snaps: [[2,2,0],[2,-2,0],[-2,-2,0],[-2,2,0]],
    },
    {
        name: 'column',
        shape: 'cube',
        constructive: true,
        size: new THREE.Vector3(0.5,4,0.5),
        material: 4,
        align: 'base',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.BoxGeometry( 0.5,4,0.5 ),
        snaps: [[2,2,0],[2,-2,0],[-2,-2,0],[-2,2,0]],
    },
    {
        name: 'small cylinder',
        shape: 'cylinder',
        constructive: true,
        size: new THREE.Vector3(0.75, 4, 0),
        material: 3,
        align: 'base',
        rotation: new THREE.Euler(0,0,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.CylinderGeometry(0.75/2, 0.75/2, 4, 8, 4),
        snaps: [[0,2,0], [0,-2,0]],
    },
    {
        name: 'slope',
        shape: 'cube',
        constructive: true,
        size: new THREE.Vector3(4,4,.5),
        material: 4,
        align: 'base',
        rotation: new THREE.Euler(Math.PI / 3, 0 ,0, 'XYZ'),
        gridSnap: false,
        wireframeGeometry: new THREE.BoxGeometry( 4,4,.5 ),
        snaps: [[2,2,0],[2,-2,0],[-2,-2,0],[-2,2,0]],
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
        wireframeGeometry: new THREE.SphereGeometry(2, 4, 4),
        snaps: [[0,0,0]],
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
        wireframeGeometry: new THREE.SphereGeometry(2, 4, 4),
        snaps: [[0,0,0]],
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
        wireframeGeometry: new THREE.BoxGeometry( 4, 0.5, 4 ),
        snaps: [[2,0,2],[2,0,-2],[-2,0,-2],[-2,0,2]],
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
        wireframeGeometry: new THREE.BoxGeometry(1, 1, 4),
        snaps: [[0,0,0]],
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
        wireframeGeometry: new THREE.CylinderGeometry(0.5, 0.5, 4, 8, 4),
        snaps: [[0,0,0]],
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
        wireframeGeometry: new THREE.BoxGeometry(2, 2, 2),
        snaps: [[1,1,1],[1,1,-1],[-1,1,-1],[-1,1,1], [1,-1,1],[1,-1,-1],[-1,-1,-1],[-1,-1,1]],
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
        wireframeGeometry: new THREE.CylinderGeometry(4, 4, 8, 8, 4),
        snaps: [[0,4,0], [0,-4,0]],
    }
]