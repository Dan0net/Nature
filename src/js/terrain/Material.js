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
const imagePaths = [
    './resources/images/terrain/rock.png',
    './resources/images/terrain/grass.png',
    './resources/images/terrain/dirt.png',
    './resources/images/terrain/wood.png',
];
const layers = imagePaths.length; // Number of layers
let width, height;  // Texture dimensions, to be determined after loading the first image

// Create a base texture array (we will fill in data after loading images)
let textureArray, combinedData;

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

// Function to load images sequentially and fill texture array data
function loadImagesSequentially(imagePaths, index = 0) {
    console.log(index, imagePaths.length)
    if (index >= imagePaths.length) {
        console.log('All images loaded!');
        // Now create and use the texture array in a material after all images are loaded
        textureArray.needsUpdate = true;

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

            // Create DataArrayTexture at the base
            textureArray = new THREE.DataArrayTexture(combinedData, width, height, layers);
            textureArray.format = THREE.RGBAFormat;
            textureArray.type = THREE.UnsignedByteType;
            textureArray.wrapT = THREE.RepeatWrapping;
            textureArray.wrapS = THREE.RepeatWrapping;
            textureArray.minFilter = THREE.NearestMipMapLinearFilter;
            textureArray.maxFilter = THREE.NearestMipMapLinearFilter;
            textureArray.anisotropy = 8;
        }

        // Draw the image on the canvas to get pixel data
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);

        // Copy the image data into the combinedData array for this layer
        combinedData.set(imageData.data, index * width * height * 4);

        // Load the next image in sequence
        loadImagesSequentially(imagePaths, index + 1);
    };

    image.onerror = function () {
        console.error(`Error loading image: ${imagePaths[index]}`);
        loadImagesSequentially(imagePaths, index + 1); // Continue to next image if error
    };
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

// loadGZTexture()
loadImagesSequentially(imagePaths);

let map = new THREE.TextureLoader().load( './resources/images/terrain/Bricks094_1K-PNG_Color.png' );
let aoMap = new THREE.TextureLoader().load( './resources/images/terrain/Bricks094_1K-PNG_AmbientOcclusion.png' );
let normalMap = new THREE.TextureLoader().load( './resources/images/terrain/Bricks094_1K-PNG_NormalGL.png' );
let roughnessMap = new THREE.TextureLoader().load( './resources/images/terrain/Bricks094_1K-PNG_Roughness.png' );
let displacementMap = new THREE.TextureLoader().load( './resources/images/terrain/Bricks094_1K-PNG_Displacement.png' );
map.wrapT = THREE.RepeatWrapping;
map.wrapS = THREE.RepeatWrapping;
normalMap.wrapT = THREE.RepeatWrapping;
normalMap.wrapS = THREE.RepeatWrapping;
displacementMap.wrapT = THREE.RepeatWrapping;
displacementMap.wrapS = THREE.RepeatWrapping;
normalMap.flipY = true;
map.anisotropy = 8;
normalMap.anisotropy = 8;
displacementMap.anisotropy = 8;
aoMap.anisotropy = 8;
roughnessMap.anisotropy = 8;
roughnessMap.wrapT = THREE.RepeatWrapping;
roughnessMap.wrapS = THREE.RepeatWrapping;
aoMap.wrapT = THREE.RepeatWrapping;
aoMap.wrapS = THREE.RepeatWrapping;

const terrainMaterial= (envmap) => {

    const mat2 = new THREE.MeshStandardMaterial( {
        map: map,
        normalMap: normalMap,
        // displacementMap: displacementMap,
        // roughnessMap: roughnessMap,
        roughness: 1,
        aoMap: aoMap,
        envmap: envmap,
    } );

    const cube = new THREE.BoxGeometry(4,4,4);
    const mesh = new THREE.Mesh(cube, mat2);
    mesh.receiveShadow = true;
    mesh.position.set(8,4,0)
    console.log(mesh.position)
    app.scene.add(mesh);

    // return new THREE.MeshPhongMaterial( {
    //     map: aoMap, // enables UV's in shader
        // normalMap: normalMap,
    //     aoMap: aoMap,
    //     // displacementMap: displacementMap,
    //     roughnessMap: roughnessMap,
    //     envmap: envmap,
    //     // glslVersion: THREE.GLSL3
    //     normalScale: new THREE.Vector2(2, 2)
    // } );

    const mat = new THREE.MeshStandardMaterial( {
        map: map, // enables UV's in shader
        normalMap: normalMap,
        normalMapType: THREE.ObjectSpaceNormalMap,
        aoMap: aoMap,
        // // displacementMap: displacementMap,
        // roughnessMap: roughnessMap,
        envmap: envmap,
        // // glslVersion: THREE.GLSL3
        // // normalScale: new THREE.Vector2(2, 2)
        // specular: new THREE.Color(.5,.5,.5),
        // reflectivity: 1.0,
        // combine: THREE.MixOperation
    } );
    console.log(mat.normalMapType, THREE.TangentSpaceNormalMap)
    mat.onBeforeCompile = ( shader ) => {

        shader.uniforms.tDiff = {
            // value: [
            // 	rocktex,
            // 	grasstex,
            // 	dirttex,
            //     woodtex
            // ]
            value: textureArray
        };

        shader.vertexShader = `
            attribute vec3 adjusted;
            attribute vec3 bary;
            attribute float light;
            flat out vec3 vAdjusted;
            varying vec3 vBary;
            varying float vLight;
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
                vLight = light;
                `
            );
        
        // precision highp sampler2DArray;

        shader.fragmentShader = `
            uniform sampler2DArray tDiff;
            varying vec3 vPos;
            varying vec3 vNormal2;
            flat in vec3 vAdjusted;
            varying vec3 vBary;
            varying float vLight;
        ` + shader.fragmentShader
            .replace(
                '#include <map_pars_fragment>',
                `
                uniform sampler2D map;
                
                vec3 getTriPlanarBlend(vec3 _wNorm){
                    vec3 blending = vec3( _wNorm );                
                    blending = abs(blending);

                    blending = normalize(max(blending, 0.00001)); // Force weights to sum to 1.0
                    float b = (blending.x + blending.y + blending.z);
                    blending /= vec3(b, b, b);
                    return blending * blending;
                }

                vec4 getTriPlanarTexture(){
                    float pixelSize = 1.0 / 32.0;
                    vec3 pos = floor(vPos / pixelSize) * pixelSize;
                    // vec3 pos = vPos;
                                        
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

                vec3 getTriTextureBasic(sampler2D tex){
                    float pixelSize = 1.0 / 32.0;
                    // vec3 pos = floor(vPos / pixelSize) * pixelSize;
                    vec3 pos = vPos;
                                        
                    //mesh scaled
                    float repeatScale = 0.25;

                    vec3 blending = getTriPlanarBlend( vNormal2 );
                    
                    vec3 xaxis = 
                        texture( tex, vec2(pos.yz * repeatScale ) ).rgb;

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
            vec4 diffuseColor =  vec4( getTriTextureBasic(map).rgb * vLight, opacity );
            // vec4 diffuseColor =  vec4(.5,.5,.5, 1.0);
            `
        );

        console.log(shader.defines)

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_maps>',
            `
            normal = normalize(getTriTextureBasic( normalMap ).xyz) * 2.0 - 1.0;
            // normal = vec3(0,0,0) * 2.0 - 1.0;
            normal = normalize( normalMatrix * normal );
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <aomap_fragment>',
            `
            #ifdef USE_AOMAP

            // reads channel R, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
            float ambientOcclusion = ( getTriTextureBasic( aoMap ).r - 1.0 ) * aoMapIntensity + 1.0;

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

    };
    return mat;
}

export default terrainMaterial;
