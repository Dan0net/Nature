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

const terrainMaterial3D = new THREE.MeshStandardMaterial( {
	// dithering: false,
	map: rocktex, // enables UV's in shader
} );
terrainMaterial3D.onBeforeCompile = ( shader ) => {

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
            vec3 hash(vec3 p) {
                p = vec3( dot(p,vec3(127.1,311.7,74.7)),
                        dot(p,vec3(269.5,183.3,246.1)),
                        dot(p,vec3(113.5,271.9,124.6)));
                return fract(sin(p)*43758.5453);
            }

            // Smooth interpolation function (improves noise quality)
            float smootherstep(float edge0, float edge1, float x) {
                x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
                return x * x * (3.0 - 2.0 * x);
            }

            // 3D Noise function
            float noise3D(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                
                vec3 u = f * f * (3.0 - 2.0 * f);  // Quintic interpolation
                
                return mix(mix(mix(dot(hash(i + vec3(0.0, 0.0, 0.0)), f - vec3(0.0, 0.0, 0.0)),
                                    dot(hash(i + vec3(1.0, 0.0, 0.0)), f - vec3(1.0, 0.0, 0.0)), u.x),
                            mix(dot(hash(i + vec3(0.0, 1.0, 0.0)), f - vec3(0.0, 1.0, 0.0)),
                                    dot(hash(i + vec3(1.0, 1.0, 0.0)), f - vec3(1.0, 1.0, 0.0)), u.x), u.y),
                        mix(mix(dot(hash(i + vec3(0.0, 0.0, 1.0)), f - vec3(0.0, 0.0, 1.0)),
                                    dot(hash(i + vec3(1.0, 0.0, 1.0)), f - vec3(1.0, 0.0, 1.0)), u.x),
                            mix(dot(hash(i + vec3(0.0, 1.0, 1.0)), f - vec3(0.0, 1.0, 1.0)),
                                    dot(hash(i + vec3(1.0, 1.0, 1.0)), f - vec3(1.0, 1.0, 1.0)), u.x), u.y), u.z);
            }

            // Function to generate grass-like color based on noise
            vec3 grassColor(float n) {
                vec3 darkGrass = vec3(0.1, 0.4, 0.1);
                vec3 midGrass = vec3(0.2, 0.6, 0.2);
                vec3 lightGrass = vec3(0.4, 0.8, 0.3);
                
                vec3 grass = mix(darkGrass, midGrass, smoothstep(0.2, 0.5, n));  // Mid-range green
                grass = mix(grass, lightGrass, smoothstep(0.5, 0.9, n));  // Light green in highest areas
                
                vec3 dirtColor = vec3(0.35, 0.25, 0.15);  // Less red, more neutral brown
                grass = mix(dirtColor, grass, smoothstep(0.2, 0.3, n));  // Only low noise values affect dirt
                
                return grass;
            }

            vec4 getNoiseTexture() {
                float pixelSize = 1.0 / 10.0;

                // Adjust the scale of the noise to get a Minecraft-like look
                vec3 pos = floor(vPos / pixelSize) * pixelSize; // Scale up for a pixelated look
                
                // Sample 3D noise at the fragment position
                float n = clamp(noise3D(pos * 4.0), 0.0, 1.0);
                
                // Get a color based on the noise value
                vec3 color = grassColor(n);
                
                // Output the final color
                return vec4(n,n,n, 1.0);
            }
            `
		);

	shader.fragmentShader = shader.fragmentShader.replace( '#include <map_fragment>', `` );

	shader.fragmentShader = shader.fragmentShader.replace(
		'vec4 diffuseColor = vec4( diffuse, opacity );',
		`
        vec4 diffuseColor =  vec4( getNoiseTexture().rgb, opacity );
        `
	);

};

export default terrainMaterial3D;
