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

// rocktex.anisotropy = 8;
// grasstex.anisotropy = 8;
// dirttex.anisotropy = 8;

rocktex.encoding = THREE.sRGBEncoding;
grasstex.encoding = THREE.sRGBEncoding;
dirttex.encoding = THREE.sRGBEncoding;

// rocktex.minFilter = THREE.LinearMipmapNearestFilter;
rocktex.wrapS = THREE.RepeatWrapping
rocktex.wrapT = THREE.RepeatWrapping

const terrainMaterialBasic = new THREE.MeshLambertMaterial( {
	// dithering: false,
	map: rocktex, // enables UV's in shader
} );
terrainMaterialBasic.onBeforeCompile = ( shader ) => {

	shader.uniforms.tDiff = {
		value: [
			rocktex,
			grasstex,
			dirttex
		]
	};

	shader.vertexShader = `
        attribute float force_stone;
        attribute float adjusted;
        varying float vAdjusted;
        varying float vForceStone;
        varying vec3 vPos;
        varying vec3 vNormal2;
    ` + shader.vertexShader
		.replace(
			'#include <worldpos_vertex>',
			`
            #include <worldpos_vertex>
            vPos = vec3( worldPosition );
            vNormal2 = normal;
            vForceStone = force_stone;
            vAdjusted = adjusted;
            `
		);

	shader.fragmentShader = `
        uniform sampler2D tDiff[3];
        varying vec3 vPos;
        varying vec3 vNormal2;
        varying float vForceStone;
        varying float vAdjusted;
    ` + shader.fragmentShader
		.replace(
			'#include <map_pars_fragment>',
			`
            #extension GL_EXT_fragment_shader_barycentric : require

            vec3 getTriPlanarBlend(vec3 _wNorm){
                vec3 blending = vec3( _wNorm );                
                blending = abs(blending);

                blending = normalize(max(blending, 0.00001)); // Force weights to sum to 1.0
                float b = (blending.x + blending.y + blending.z);
                blending /= vec3(b, b, b);
                return blending * blending;
            }

            vec3 computeBarycentric(vec3 p, vec3 a, vec3 b, vec3 c)
            {
                vec3 v0 = b - a;
                vec3 v1 = c - a;
                vec3 v2 = p - a;
                float d00 = dot(v0, v0);
                float d01 = dot(v0, v1);
                float d11 = dot(v1, v1);
                float d20 = dot(v2, v0);
                float d21 = dot(v2, v1);
                float denom = d00 * d11 - d01 * d01;
                vec3 barycentric;
                barycentric.y = (d11 * d20 - d01 * d21) / denom;
                barycentric.z = (d00 * d21 - d01 * d20) / denom;
                barycentric.x = 1.0 - barycentric.y - barycentric.z;
                return barycentric;
            }

            vec4 getTriPlanarTexture(){

                return vec4(gl_BaryCoordEXT, 1.0);
                                    
                //mesh scaled
                float rockRepeat = 0.1;
                float grassRepeat = 1.0;
                float dirtRepeat = 0.1;

                vec3 blending = getTriPlanarBlend( vNormal2 );
                
                vec3 xaxis = texture2D( tDiff[0], (vPos.yz * grassRepeat) ).rgb;

                vec3 zaxis = texture2D( tDiff[0], (vPos.xy * grassRepeat) ).rgb;
                
                vec3 yaxis = texture2D( tDiff[0], (vPos.xz * grassRepeat) ).rgb;

                return vec4( yaxis, 1.0 );

            }

            vec4 getEdge(){
                // Calculate the index in the vertex array based on gl_PrimitiveID
                int triangleID = gl_PrimitiveID;
                if (triangleID >= triangleCount) {
                    discard; // Safety check in case of overflow
                }

                // Fetch the triangle vertices using the triangle ID
                vec3 v0 = vertexPositions[3 * triangleID + 0];
                vec3 v1 = vertexPositions[3 * triangleID + 1];
                vec3 v2 = vertexPositions[3 * triangleID + 2];

                // Get the current fragment's position in world space (you'll need to pass this)
                vec3 fragmentPosition = ... ;  // Use interpolated vertex position or another method to get this

                // Calculate barycentric coordinates
                vec3 barycentric = computeBarycentric(fragmentPosition, v0, v1, v2);

                // Optional: Highlight edges by checking how close the barycentric coords are to zero
                float edgeThreshold = 0.02;
                float edge = min(min(barycentric.x, barycentric.y), barycentric.z);

                if (edge < edgeThreshold) {
                    FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Draw edges in black
                } else {
                    FragColor = vec4(barycentric, 1.0); // Color based on barycentric coordinates
                }
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

export default terrainMaterialBasic;
