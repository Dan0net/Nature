import * as THREE from 'three';
import { gzipSync, decompressSync, gunzip, gunzipSync } from 'fflate';

//     .                                          o8o
//   .o8                                          `"'
// .o888oo  .ooooo.  oooo d8b oooo d8b  .oooo.   oooo  ooo. .oo.
//   888   d88' `88b `888""8P `888""8P `P  )88b  `888  `888P"Y88b
//   888   888ooo888  888      888      .oP"888   888   888   888
//   888 . 888    .o  888      888     d8(  888   888   888   888
//   "888" `Y8bod8P' d888b    d888b    `Y888""8o o888o o888o o888o
// let rocktex = new THREE.TextureLoader().load( './resources/images/terrain/rock.jpg' );
// let grasstex = new THREE.TextureLoader().load( './resources/images/terrain/grass.png' );
// let dirttex = new THREE.TextureLoader().load( './resources/images/terrain/dirt.png' );
// let woodtex = new THREE.TextureLoader().load( './resources/images/terrain/wood.png' );

// rocktex.anisotropy = 8;
// grasstex.anisotropy = 8;
// dirttex.anisotropy = 8;
// woodtex.anisotropy = 8;

// rocktex.wrapS = THREE.RepeatWrapping;
// grasstex.wrapS = THREE.RepeatWrapping;
// dirttex.wrapS = THREE.RepeatWrapping;
// woodtex.wrapS = THREE.RepeatWrapping;
// rocktex.wrapT = THREE.RepeatWrapping;
// grasstex.wrapT = THREE.RepeatWrapping;
// dirttex.wrapT = THREE.RepeatWrapping;
// woodtex.wrapT = THREE.RepeatWrapping;

// rocktex.encoding = THREE.sRGBEncoding;
// grasstex.encoding = THREE.sRGBEncoding;
// dirttex.encoding = THREE.sRGBEncoding;
// woodtex.encoding = THREE.sRGBEncoding;

// grasstex.minFilter = THREE.NearestFilter;

// // create a buffer with color data
// const width = 512;
// const height = 512;
// const depth = 512;

// const size = width * height;
// const data = new Uint8Array( 4 * size * depth );

// for ( let i = 0; i < depth; i ++ ) {
// 	const color = new THREE.Color( Math.random(), Math.random(), Math.random() );
// 	const r = Math.floor( color.r * 255 );
// 	const g = Math.floor( color.g * 255 );
// 	const b = Math.floor( color.b * 255 );

// 	for ( let j = 0; j < size; j ++ ) {
// 		const stride = ( i * size + j ) * 4;
// 		data[ stride ] = r;
// 		data[ stride + 1 ] = g;
// 		data[ stride + 2 ] = b;
// 		data[ stride + 3 ] = 255;
// 	}
// }

// // used the buffer to create a DataArrayTexture
// const texture = new THREE.DataArrayTexture( data, width, height, depth );
// texture.needsUpdate = true;

// Define the number of images and size of the texture

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up after download
}

function createGzipFile() {
    // Sample data (string or array of data) to compress
    // const data = "This is the content to compress and download as a GZIP file.";

    // Convert data into a Uint8Array (since gzip needs binary data)
    // const uint8Data = new TextEncoder().encode(data);
    console.log(combinedData)
    // GZIP compression using fflate
    const gzippedData = gzipSync(combinedData, {
        filename: 'worldify-texture'
    }); // Synchronous GZIP compression

    // Create a Blob from the compressed data
    const blob = new Blob([gzippedData], { type: 'application/gzip' });

    // Trigger download
    downloadBlob(blob, 'worldify-texture.gz');
}


document.getElementById('downloadButton').addEventListener('click', createGzipFile);




// Create a base texture array (we will fill in data after loading images)
function loadTextureArray(imagePaths) {
    let textureArray;
    let combinedData;
    const layers = imagePaths.length; // Number of layers
    let width, height; // Texture dimensions, to be determined after loading the first image

    // Function to load images sequentially and fill texture array data
    function loadImagesSequentially(index = 0) {
        return new Promise((resolve, reject) => {
            if (index >= imagePaths.length) {
                console.log('All images loaded!');
                textureArray.needsUpdate = true;
                resolve(textureArray);
                return;
            }

            // Load each image
            const image = new Image();
            image.src = imagePaths[index];
            image.onload = function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = image.width;
                canvas.height = image.height;

                if (index === 0) {
                    // Set width and height based on the first image
                    width = image.width;
                    height = image.height;

                    // Initialize combined data for all layers
                    combinedData = new Uint8Array(width * height * 4 * layers); // 4 channels (RGBA)

                    // Create DataArrayTexture after the first image loads
                    textureArray = new THREE.DataArrayTexture(combinedData, width, height, layers);
                    textureArray.format = THREE.RGBAFormat;
                    textureArray.type = THREE.UnsignedByteType;
                    textureArray.wrapT = THREE.RepeatWrapping;
                    textureArray.wrapS = THREE.RepeatWrapping;
                    textureArray.minFilter = THREE.LinearMipMapLinearFilter;
                    textureArray.maxFilter = THREE.LinearMipMapLinearFilter;
                    textureArray.anisotropy = 8;
                }

                // Draw the image on the canvas to get pixel data
                ctx.drawImage(image, 0, 0);
                const imageData = ctx.getImageData(0, 0, width, height);

                // Copy the image data into the combinedData array for this layer
                combinedData.set(imageData.data, index * width * height * 4);

                // Load the next image in sequence
                loadImagesSequentially(index + 1).then(resolve).catch(reject);
            };

            image.onerror = function () {
                reject(`Error loading image: ${image.src}`);
            };
        });
    }

    // Return a promise that resolves when all images are loaded
    return new Promise((resolve, reject) => {
        loadImagesSequentially().then(resolve).catch(reject);
    });
}

// Start loading images sequentially

const options = {
    headers: new Headers({'content-type': 'application/gzip'}),
    mode: 'no-cors'
};

function loadGZTexture() {
    fetch('./resources/images/terrain/worldify-texture.gz', options)
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to fetch the file");
            }
            console.log("Content-Type:", response.headers.get('Content-Type'));
            console.log(response)
            return response.arrayBuffer();
        })
        .then(compressedData => {
            // Step 2: Decompress the GZIP file using fflate
            gunzipSync(compressedData, (err, decompressedData) => {
                if (err) {
                    console.error("Decompression failed:", err);
                    loadImagesSequentially(imagePaths);
                    return;
                }

                console.log("Decompressed data:", decompressedData);

                console.log(data)
                console.log(array)
                console.log('loaded texture gz')

                textureArray = new THREE.DataArrayTexture( decompressedData, 128, 128, 4 );
                textureArray.format = THREE.RGBAFormat;
                textureArray.type = THREE.UnsignedByteType;
                textureArray.wrapT = THREE.RepeatWrapping;
                textureArray.wrapS = THREE.RepeatWrapping;
                textureArray.needsUpdate = true;
            });
        }
    );
}

let mapArray, normalArray, aoArray, roughnessArray;

const mapArrayPromise = loadTextureArray([
    './resources/images/terrain/Rock028_1K-PNG_Color.png',
    './resources/images/terrain/Grass001_1K-PNG_Color.png',
    './resources/images/terrain/Ground051_1K-PNG_Color.png',
    './resources/images/terrain/Bark014_1K-PNG_Color.png',
    './resources/images/terrain/Bricks094_1K-PNG_Color.png',
    './resources/images/terrain/Ground080_1K-PNG_Color.png',
]);

const normalMapArrayPromise = loadTextureArray([
    './resources/images/terrain/Rock028_1K-PNG_NormalGL.png',
    './resources/images/terrain/Grass001_1K-PNG_NormalGL.png',
    './resources/images/terrain/Ground051_1K-PNG_NormalGL.png',
    './resources/images/terrain/Bark014_1K-PNG_NormalGL.png',
    './resources/images/terrain/Bricks094_1K-PNG_NormalGL.png',
    './resources/images/terrain/Ground080_1K-PNG_NormalGL.png',
]);

const aoMapArrayPromise = loadTextureArray([
    './resources/images/terrain/Rock028_1K-PNG_AmbientOcclusion.png',
    './resources/images/terrain/Grass001_1K-PNG_AmbientOcclusion.png',
    './resources/images/terrain/Ground051_1K-PNG_AmbientOcclusion.png',
    './resources/images/terrain/Bark014_1K-PNG_AmbientOcclusion.png',
    './resources/images/terrain/Bricks094_1K-PNG_AmbientOcclusion.png',
    './resources/images/terrain/Ground080_1K-PNG_AmbientOcclusion.png',
]);

const roughnessMapArrayPromise = loadTextureArray([
    './resources/images/terrain/Rock028_1K-PNG_Roughness.png',
    './resources/images/terrain/Grass001_1K-PNG_Roughness.png',
    './resources/images/terrain/Ground051_1K-PNG_Roughness.png',
    './resources/images/terrain/Bark014_1K-PNG_Roughness.png',
    './resources/images/terrain/Bricks094_1K-PNG_Roughness.png',
    './resources/images/terrain/Ground080_1K-PNG_Roughness.png',
]);

Promise.all([mapArrayPromise, normalMapArrayPromise, aoMapArrayPromise, roughnessMapArrayPromise])
.then(([mapArrayA, normalArrayA, aoArrayA, roughnessArrayA]) => {
    // Assign the loaded texture arrays to the shader uniforms
    mapArray = mapArrayA;
    normalArray = normalArrayA;
    aoArray = aoArrayA;
    roughnessArray = roughnessArrayA;

    console.log('Both texture arrays are set as shader uniforms');
}).catch(error => {
    console.error('Error loading texture arrays:', error);
});

let map = new THREE.TextureLoader().load( './resources/images/terrain/Bricks094_1K-PNG_Color.png' );
let aoMap = new THREE.TextureLoader().load( './resources/images/terrain/Bricks094_1K-PNG_AmbientOcclusion.png' );
let normalMap = new THREE.TextureLoader().load( './resources/images/terrain/Bricks094_1K-PNG_NormalGL.png' );
let roughnessMap = new THREE.TextureLoader().load( './resources/images/terrain/Bricks094_1K-PNG_Roughness.png' );
// let displacementMap = new THREE.TextureLoader().load( './resources/images/terrain/Bricks094_1K-PNG_Displacement.png' );

// // let map = new THREE.TextureLoader().load( './resources/images/terrain/Metal049A_1K-PNG_Color.png' );
// // let aoMap = new THREE.TextureLoader().load( './resources/images/terrain/Metal049A_1K-PNG_AmbientOcclusion.png' );
// // let normalMap = new THREE.TextureLoader().load( './resources/images/terrain/Metal049A_1K-PNG_NormalGL.png' );
// // let roughnessMap = new THREE.TextureLoader().load( './resources/images/terrain/Metal049A_1K-PNG_Roughness.png' );
// let metalnessMap = new THREE.TextureLoader().load( './resources/images/terrain/Metal049A_1K-PNG_Metalness.png' );
// // let displacementMap = new THREE.TextureLoader().load( './resources/images/terrain/Metal049A_1K-PNG_Displacement.png' );

// map.wrapT = THREE.RepeatWrapping;
// map.wrapS = THREE.RepeatWrapping;
// normalMap.wrapT = THREE.RepeatWrapping;
// normalMap.wrapS = THREE.RepeatWrapping;
// // displacementMap.wrapT = THREE.RepeatWrapping;
// // displacementMap.wrapS = THREE.RepeatWrapping;
// normalMap.flipY = true;
// map.anisotropy = 8;
// normalMap.anisotropy = 8;
// // displacementMap.anisotropy = 8;
// // aoMap.anisotropy = 8;
// roughnessMap.anisotropy = 8;
// roughnessMap.wrapT = THREE.RepeatWrapping;
// roughnessMap.wrapS = THREE.RepeatWrapping;
// aoMap.wrapT = THREE.RepeatWrapping;
// aoMap.wrapS = THREE.RepeatWrapping;
// metalnessMap.anisotropy = 8;
// metalnessMap.wrapT = THREE.RepeatWrapping;
// metalnessMap.wrapS = THREE.RepeatWrapping;
const terrainMaterial= (envmap) => {

    // const mat2 = new THREE.MeshStandardMaterial( {
    //     map: map,
    //     normalMap: normalMap,
    //     // displacementMap: displacementMap,
    //     // roughnessMap: roughnessMap,
    //     normalScale: new THREE.Vector2(2,2),
    //     // roughness: 1,
    //     // aoMap: aoMap,
    //     // envmap: envmap,
    // } );

    // const cube = new THREE.BoxGeometry(4,4,4);
    // const mesh = new THREE.Mesh(cube, mat2);
    // mesh.receiveShadow = true;
    // mesh.position.set(8,4,0)
    // console.log(mesh.position)
    // app.scene.add(mesh);
    console.log(envmap)
    const mat = new THREE.MeshStandardMaterial( {
        map: map,
        normalMap: normalMap,
        normalMapType: THREE.ObjectSpaceNormalMap,
        aoMap: aoMap,
        // displacementMap: displacementMap,
        // displacementScale: 2.0,
        roughnessMap: roughnessMap,
        // metalnessMap: metalnessMap,
        // metalness: 0.5,
        // envmap: envmap,
        // normalScale: new THREE.Vector2(2, 2)
        // envMapIntensity: 1.0
    } );

    mat.onBeforeCompile = ( shader ) => {
        console.log(mapArray)
        shader.uniforms.mapArray = {
            value: mapArray
        };
        shader.uniforms.normalArray = {
            value: normalArray
        };
        shader.uniforms.aoArray = {
            value: aoArray
        };
        shader.uniforms.roughnessArray = {
            value: roughnessArray
        };
        shader.uniforms.repeatScale = {value: 1.0 / 8.0};

        shader.vertexShader = `
            attribute vec3 adjusted;
            attribute vec3 bary;
            attribute float light;
            flat out vec3 vAdjusted;
            varying vec3 vBary;
            varying vec3 ambientLightColor;
            varying vec3 vPos;
            varying vec3 vNormal2;

            uniform float repeatScale;

            vec3 getTriPlanarBlend(vec3 _wNorm){
                vec3 blending = vec3( _wNorm );                
                blending = abs(blending);

                blending = normalize(max(blending, 0.00001)); // Force weights to sum to 1.0
                float b = blending.x + blending.y + blending.z;
                blending /= vec3(b, b, b);
                return blending;
                // return pow(blending, vec3(4.0, 4.0, 4.0));
            }

            vec3 getPos() {
                float pixelSize = 1.0 / 32.0;
                // return floor(vPos / pixelSize) * pixelSize;
                return vPos;
            }

            vec3 getTriTextureBlend(sampler2D tex, vec3 _normal, vec3 pos){                                  
                vec3 blending = getTriPlanarBlend( _normal );

                vec3 xaxis = 
                    texture( tex, vec2(pos.zy * repeatScale ) ).rgb;

                vec3 zaxis = 
                    texture( tex, vec2(pos.xy * repeatScale ) ).rgb;

                vec3 yaxis = 
                    texture( tex, vec2(pos.xz * repeatScale ) ).rgb;
                

                return vec3( xaxis * blending.x + yaxis * blending.y + zaxis * blending.z );
            
            }
        ` + shader.vertexShader
            .replace(
                '#include <worldpos_vertex>',
                `
                #include <worldpos_vertex>
                vPos = vec3( worldPosition );
                vNormal2 = normal;
                vAdjusted = adjusted;
                vBary = bary;
                ambientLightColor = vec3(light,light,light);
                `
            );

        shader.vertexShader = shader.vertexShader.replace(
            '#include <displacementmap_vertex>',
            `
            #ifdef USE_DISPLACEMENTMAP

	            transformed += normalize( objectNormal ) * ( getTriTextureBlend( displacementMap, objectNormal, vec3(position) ).x * displacementScale + displacementBias );

            #endif
            `
        );
        
        // precision highp sampler2DArray;

        shader.fragmentShader = `
            uniform sampler2DArray mapArray;
            uniform sampler2DArray normalArray;
            uniform sampler2DArray aoArray;
            uniform sampler2DArray roughnessArray;
            uniform float repeatScale;
            varying vec3 vPos;
            varying vec3 vNormal2;
            flat in vec3 vAdjusted;
            varying vec3 vBary;
        ` + shader.fragmentShader
            .replace(
                '#include <map_pars_fragment>',
                `
                uniform sampler2D map;
                
                vec3 getTriPlanarBlend(vec3 _wNorm){
                    vec3 blending = vec3( _wNorm );                
                    blending = abs(blending);

                    blending = normalize(max(blending, 0.00001)); // Force weights to sum to 1.0
                    float b = blending.x + blending.y + blending.z;
                    blending /= vec3(b, b, b);
                    return blending;
                    // return pow(blending, vec3(4.0, 4.0, 4.0));
                }

                
                vec3 getPos() {
                    float pixelSize = 1.0 / 64.0;
                    // return floor(vPos / pixelSize) * pixelSize;
                    return vPos;
                }

                vec4 getTriPlanarTexture(sampler2DArray tex){
                    vec3 pos = getPos();

                    vec3 blending = getTriPlanarBlend( vNormal2 );
                    
                    vec3 xaxis = 
                        texture( tex, vec3(pos.zy * repeatScale, int(vAdjusted.x)) ).rgb * vBary.x +
                        texture( tex, vec3(pos.zy * repeatScale, int(vAdjusted.y)) ).rgb * vBary.y +
                        texture( tex, vec3(pos.zy * repeatScale, int(vAdjusted.z)) ).rgb * vBary.z;

                    vec3 zaxis = 
                        texture( tex, vec3(pos.xy * repeatScale, int(vAdjusted.x)) ).rgb * vBary.x +
                        texture( tex, vec3(pos.xy * repeatScale, int(vAdjusted.y)) ).rgb * vBary.y +
                        texture( tex, vec3(pos.xy * repeatScale, int(vAdjusted.z)) ).rgb * vBary.z;

                    vec3 yaxis = 
                        texture( tex, vec3(pos.xz * repeatScale, int(vAdjusted.x)) ).rgb * vBary.x +
                        texture( tex, vec3(pos.xz * repeatScale, int(vAdjusted.y)) ).rgb * vBary.y +
                        texture( tex, vec3(pos.xz * repeatScale, int(vAdjusted.z)) ).rgb * vBary.z;

                    return vec4( xaxis * blending.x + yaxis * blending.y + zaxis * blending.z, 1.0 );
                
                }

                vec3 getTriTextureBasic(sampler2D tex){
                    vec3 pos = getPos();
                                        
                    vec3 blending = getTriPlanarBlend( vNormal2 );

                    if (blending.x >= blending.y && blending.x >= blending.z) {
                        return texture( tex, vec2(pos.zy * repeatScale ) ).rgb;
                    } else if (blending.y >= blending.x && blending.y >= blending.z) {
                        return texture( tex, vec2(pos.xz * repeatScale ) ).rgb;
                    }
                    return texture( tex, vec2(pos.xy * repeatScale ) ).rgb;
                }

                vec3 getTriTextureBlend(sampler2D tex){
                    vec3 pos = getPos();
                                        
                    vec3 blending = getTriPlanarBlend( vNormal2 );

                    vec3 xaxis = 
                        texture( tex, vec2(pos.zy * repeatScale ) ).rgb;

                    vec3 zaxis = 
                        texture( tex, vec2(pos.xy * repeatScale ) ).rgb;

                    vec3 yaxis = 
                        texture( tex, vec2(pos.xz * repeatScale ) ).rgb;
                    

                    return vec3( xaxis * blending.x + yaxis * blending.y + zaxis * blending.z );
                
                }
                `
            );

        shader.fragmentShader = shader.fragmentShader.replace( '#include <map_fragment>', `` );

        shader.fragmentShader = shader.fragmentShader.replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            `
            vec4 diffuseColor =  vec4( getTriPlanarTexture(mapArray).rgb, opacity );
            // vec4 diffuseColor =  vec4(.5,.5,.5, 1.0);
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_maps>',
            `
                vec3 texelNormal = normalize(getTriPlanarTexture( normalArray ).xyz) * 2.0 - 1.0;
                texelNormal.xy *= normalScale;

                // normal = normalize( vNormal + texelNormal );
                // normal = normalize( mix(-vViewPosition, texelNormal, 0.5) );

                vec3 q0 = dFdx( - vViewPosition.xyz );
                vec3 q1 = dFdy( - vViewPosition.xyz );
                vec2 st0 = dFdx( vec2(1,1) );
                vec2 st1 = dFdy( vec2(1,1) );

                vec3 N = normalize( vNormal ); // normalized

                vec3 q1perp = cross( q1, N );
                vec3 q0perp = cross( N, q0 );

                // vec3 T = q1perp * st0.x + q0perp * st1.x;
                vec3 T = q1perp;
                // vec3 B = q1perp * st0.y + q0perp * st1.y;
                vec3 B = q0perp;

                float det = max( dot( T, T ), dot( B, B ) );
                float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );

                mat3 tbn = mat3( T * scale, B * scale, N );

                normal = normalize( tbn * texelNormal );
                // normal = normalize( vNormal );
            
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <aomap_fragment>',
            `
            #ifdef USE_AOMAP

                // reads channel R, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
                float ambientOcclusion = ( getTriPlanarTexture( aoArray ).r - 1.0 ) * aoMapIntensity + 1.0;

                reflectedLight.indirectDiffuse *= ambientOcclusion;

                #if defined( USE_CLEARCOAT ) 
                    clearcoatSpecularIndirect *= ambientOcclusion;
                #endif

                #if defined( USE_SHEEN ) 
                    sheenSpecularIndirect *= ambientOcclusion;
                #endif

                #if defined( USE_ENVMAP ) && defined( STANDARD )

                    float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );

                    reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );

                #endif

            #endif
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <roughnessmap_fragment>',
            `
            float roughnessFactor = roughness;

            #ifdef USE_ROUGHNESSMAP

                vec3 texelRoughness = getTriPlanarTexture( roughnessArray ).rgb;

                // reads channel G, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
                roughnessFactor *= texelRoughness.g;

            #endif
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <lights_pars_begin>',
            `
            uniform bool receiveShadow;
            varying vec3 ambientLightColor; // change ambient light to input from vertex shader
            // uniform vec3 ambientLightColor;

            #if defined( USE_LIGHT_PROBES )

                uniform vec3 lightProbe[ 9 ];

            #endif

            // get the irradiance (radiance convolved with cosine lobe) at the point 'normal' on the unit sphere
            // source: https://graphics.stanford.edu/papers/envmap/envmap.pdf
            vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {

                // normal is assumed to have unit length

                float x = normal.x, y = normal.y, z = normal.z;

                // band 0
                vec3 result = shCoefficients[ 0 ] * 0.886227;

                // band 1
                result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
                result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
                result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;

                // band 2
                result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
                result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
                result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
                result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
                result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );

                return result;

            }

            vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {

                vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );

                vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );

                return irradiance;

            }

            vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {

                vec3 irradiance = ambientLightColor;

                return irradiance;

            }

            float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {

                // based upon Frostbite 3 Moving to Physically-based Rendering
                // page 32, equation 26: E[window1]
                // https://seblagarde.files.wordpress.com/2015/07/course_notes_moving_frostbite_to_pbr_v32.pdf
                float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );

                if ( cutoffDistance > 0.0 ) {

                    distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );

                }

                return distanceFalloff;

            }

            float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {

                return smoothstep( coneCosine, penumbraCosine, angleCosine );

            }

            #if NUM_DIR_LIGHTS > 0

                struct DirectionalLight {
                    vec3 direction;
                    vec3 color;
                };

                uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];

                void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {

                    light.color = directionalLight.color;
                    light.direction = directionalLight.direction;
                    light.visible = true;

                }

            #endif


            #if NUM_POINT_LIGHTS > 0

                struct PointLight {
                    vec3 position;
                    vec3 color;
                    float distance;
                    float decay;
                };

                uniform PointLight pointLights[ NUM_POINT_LIGHTS ];

                // light is an out parameter as having it as a return value caused compiler errors on some devices
                void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {

                    vec3 lVector = pointLight.position - geometryPosition;

                    light.direction = normalize( lVector );

                    float lightDistance = length( lVector );

                    light.color = pointLight.color;
                    light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
                    light.visible = ( light.color != vec3( 0.0 ) );

                }

            #endif


            #if NUM_SPOT_LIGHTS > 0

                struct SpotLight {
                    vec3 position;
                    vec3 direction;
                    vec3 color;
                    float distance;
                    float decay;
                    float coneCos;
                    float penumbraCos;
                };

                uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];

                // light is an out parameter as having it as a return value caused compiler errors on some devices
                void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {

                    vec3 lVector = spotLight.position - geometryPosition;

                    light.direction = normalize( lVector );

                    float angleCos = dot( light.direction, spotLight.direction );

                    float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );

                    if ( spotAttenuation > 0.0 ) {

                        float lightDistance = length( lVector );

                        light.color = spotLight.color * spotAttenuation;
                        light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
                        light.visible = ( light.color != vec3( 0.0 ) );

                    } else {

                        light.color = vec3( 0.0 );
                        light.visible = false;

                    }

                }

            #endif


            #if NUM_RECT_AREA_LIGHTS > 0

                struct RectAreaLight {
                    vec3 color;
                    vec3 position;
                    vec3 halfWidth;
                    vec3 halfHeight;
                };

                // Pre-computed values of LinearTransformedCosine approximation of BRDF
                // BRDF approximation Texture is 64x64
                uniform sampler2D ltc_1; // RGBA Float
                uniform sampler2D ltc_2; // RGBA Float

                uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];

            #endif


            #if NUM_HEMI_LIGHTS > 0

                struct HemisphereLight {
                    vec3 direction;
                    vec3 skyColor;
                    vec3 groundColor;
                };

                uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];

                vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {

                    float dotNL = dot( normal, hemiLight.direction );
                    float hemiDiffuseWeight = 0.5 * dotNL + 0.5;

                    vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );

                    return irradiance;

                }

            #endif
            `
        );

    };
    return mat;
}

export default terrainMaterial;
