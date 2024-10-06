import * as THREE from 'three';

//     .                                          o8o
//   .o8                                          `"'
// .o888oo  .ooooo.  oooo d8b oooo d8b  .oooo.   oooo  ooo. .oo.
//   888   d88' `88b `888""8P `888""8P `P  )88b  `888  `888P"Y88b
//   888   888ooo888  888      888      .oP"888   888   888   888
//   888 . 888    .o  888      888     d8(  888   888   888   888
//   "888" `Y8bod8P' d888b    d888b    `Y888""8o o888o o888o o888o
let rocktex = new THREE.TextureLoader().load( './resources/images/terrain/rock.jpg' );
let grasstex = new THREE.TextureLoader().load( './resources/images/terrain/grass.png' );
let dirttex = new THREE.TextureLoader().load( './resources/images/terrain/dirt.png' );
let woodtex = new THREE.TextureLoader().load( './resources/images/terrain/wood.png' );

rocktex.anisotropy = 8;
grasstex.anisotropy = 8;
dirttex.anisotropy = 8;
woodtex.anisotropy = 8;

rocktex.wrapS = THREE.RepeatWrapping;
grasstex.wrapS = THREE.RepeatWrapping;
dirttex.wrapS = THREE.RepeatWrapping;
woodtex.wrapS = THREE.RepeatWrapping;
rocktex.wrapT = THREE.RepeatWrapping;
grasstex.wrapT = THREE.RepeatWrapping;
dirttex.wrapT = THREE.RepeatWrapping;
woodtex.wrapT = THREE.RepeatWrapping;

rocktex.encoding = THREE.sRGBEncoding;
grasstex.encoding = THREE.sRGBEncoding;
dirttex.encoding = THREE.sRGBEncoding;
woodtex.encoding = THREE.sRGBEncoding;

grasstex.minFilter = THREE.NearestFilter;

// create a buffer with color data
const width = 512;
const height = 512;
const depth = 100;

const size = width * height;
const data = new Uint8Array( 4 * size * depth );

for ( let i = 0; i < depth; i ++ ) {
	const color = new THREE.Color( Math.random(), Math.random(), Math.random() );
	const r = Math.floor( color.r * 255 );
	const g = Math.floor( color.g * 255 );
	const b = Math.floor( color.b * 255 );

	for ( let j = 0; j < size; j ++ ) {
		const stride = ( i * size + j ) * 4;
		data[ stride ] = r;
		data[ stride + 1 ] = g;
		data[ stride + 2 ] = b;
		data[ stride + 3 ] = 255;
	}
}

// used the buffer to create a DataArrayTexture
const texture = new THREE.DataArrayTexture( data, width, height, depth );
texture.needsUpdate = true;

const terrainMaterial = new THREE.MeshStandardMaterial( {
	// dithering: false,
	map: texture, // enables UV's in shader
    glslVersion: THREE.GLSL3
} );
terrainMaterial.onBeforeCompile = ( shader ) => {

	shader.uniforms.tDiff = {
		// value: [
		// 	rocktex,
		// 	grasstex,
		// 	dirttex,
        //     woodtex
		// ]
        value: texture
	};

	shader.vertexShader = `
        attribute vec3 adjusted;
        attribute vec3 bary;
        flat out vec3 vAdjusted;
        varying vec3 vBary;
        varying vec3 vPos;
        varying vec3 vNormal2;
    ` + shader.vertexShader
		.replace(
			'#include <worldpos_vertex>',
			`
            #include <worldpos_vertex>
            vPos = vec3( worldPosition );
            vNormal2 = normal;
            vAdjusted = adjusted;
            vBary = bary;
            `
		);

	shader.fragmentShader = `
        precision highp sampler2DArray;
        uniform sampler2DArray tDiff;
        varying vec3 vPos;
        varying vec3 vNormal2;
        flat in vec3 vAdjusted;
        varying vec3 vBary;
    ` + shader.fragmentShader
		.replace(
			'#include <map_pars_fragment>',
			`

            vec3 getTriPlanarBlend(vec3 _wNorm){
                vec3 blending = vec3( _wNorm );                
                blending = abs(blending);

                blending = normalize(max(blending, 0.00001)); // Force weights to sum to 1.0
                float b = (blending.x + blending.y + blending.z);
                blending /= vec3(b, b, b);
                return blending * blending;
            }

            vec4 getTriPlanarTexture(){
                float pixelSize = 1.0 / 16.0;
                vec3 pos = floor(vPos / pixelSize) * pixelSize;
                                    
                //mesh scaled
                float repeatScale = 0.25;

                vec3 blending = getTriPlanarBlend( vNormal2 );
                
                vec3 xaxis = 
                    texture( tDiff, vec3(pos.yz * repeatScale, int(vAdjusted.x)) ).rgb * vBary.x +
                    texture( tDiff, vec3(pos.yz * repeatScale, int(vAdjusted.y)) ).rgb * vBary.y +
                    texture( tDiff, vec3(pos.yz * repeatScale, int(vAdjusted.z)) ).rgb * vBary.z;

                vec3 zaxis = 
                    texture( tDiff, vec3(pos.xy * repeatScale, int(vAdjusted.x)) ).rgb * vBary.x +
                    texture( tDiff, vec3(pos.xy * repeatScale, int(vAdjusted.y)) ).rgb * vBary.y +
                    texture( tDiff, vec3(pos.xy * repeatScale, int(vAdjusted.z)) ).rgb * vBary.z;

                vec3 yaxis = 
                    texture( tDiff, vec3(pos.xz * repeatScale, int(vAdjusted.x)) ).rgb * vBary.x +
                    texture( tDiff, vec3(pos.xz * repeatScale, int(vAdjusted.y)) ).rgb * vBary.y +
                    texture( tDiff, vec3(pos.xz * repeatScale, int(vAdjusted.z)) ).rgb * vBary.z;

                return vec4( xaxis * blending.x + yaxis * blending.y + zaxis * blending.z, 1.0 );

            }
            `
		);

	shader.fragmentShader = shader.fragmentShader.replace( '#include <map_fragment>', `` );

	shader.fragmentShader = shader.fragmentShader.replace(
		'vec4 diffuseColor = vec4( diffuse, opacity );',
		`
        vec4 diffuseColor =  vec4( getTriPlanarTexture().rgb, opacity );
        `
	);

};

export default terrainMaterial;
