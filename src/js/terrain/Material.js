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

const terrainMaterial = new THREE.MeshStandardMaterial( {
	// dithering: false,
	map: rocktex, // enables UV's in shader
} );
terrainMaterial.onBeforeCompile = ( shader ) => {

	shader.uniforms.tDiff = {
		value: [
			rocktex,
			grasstex,
			dirttex,
            woodtex
		]
	};

	shader.vertexShader = `
        attribute vec4 adjusted;
        varying vec4 vAdjusted;
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
            `
		);

	shader.fragmentShader = `
        uniform sampler2D tDiff[4];
        varying vec3 vPos;
        varying vec3 vNormal2;
        varying vec4 vAdjusted;
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
                    texture2D( tDiff[0], pos.yz * repeatScale ).rgb * vAdjusted.x +
                    texture2D( tDiff[1], pos.yz * repeatScale ).rgb * vAdjusted.y +
                    texture2D( tDiff[2], pos.yz * repeatScale ).rgb * vAdjusted.z +
                    texture2D( tDiff[3], pos.yz * repeatScale ).rgb * vAdjusted.w;

                vec3 zaxis = 
                    texture2D( tDiff[0], pos.xy * repeatScale ).rgb * vAdjusted.x +
                    texture2D( tDiff[1], pos.xy * repeatScale ).rgb * vAdjusted.y +
                    texture2D( tDiff[2], pos.xy * repeatScale ).rgb * vAdjusted.z +
                    texture2D( tDiff[3], pos.xy * repeatScale ).rgb * vAdjusted.w;

                vec3 yaxis = 
                    texture2D( tDiff[0], pos.xz * repeatScale ).rgb * vAdjusted.x +
                    texture2D( tDiff[1], pos.xz * repeatScale ).rgb * vAdjusted.y +
                    texture2D( tDiff[2], pos.xz * repeatScale ).rgb * vAdjusted.z +
                    texture2D( tDiff[3], pos.xz * repeatScale ).rgb * vAdjusted.w;

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
