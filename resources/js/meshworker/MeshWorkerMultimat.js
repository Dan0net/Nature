importScripts( "SurfaceNets.js" );
const surfaceNetEngine = new SurfaceNets();

// oooo d8b oooo  oooo  ooo. .oo.
// `888""8P `888  `888  `888P"Y88b
//  888      888   888   888   888
//  888      888   888   888   888
// d888b     `V88V"V8P' o888o o888o


self.onmessage = ( { data } ) => {

	if ( data.grid ) generateMesh( data );

};

function generateMesh( { grid, gridSize, terrainHeights, adjustedIndices, lightIndices } ) {

	surfaceNetEngine.createSurface( grid, [ gridSize.x, gridSize.y, gridSize.z ] ).then( generatedSurface => {
		// const topvertmap = {};

		const indices = new Uint16Array( generatedSurface.faces.length * 2 * 3 ); //2 faces per generated face, 3 vertices
		const vertices = new Float32Array( generatedSurface.faces.length * 2 * 3 * 3 ); //2 faces per generated face, 3 vertices, 3 xyz coords
		const bary = new Float32Array( generatedSurface.faces.length * 2 * 3 * 3 ); //2 faces per generated face, 3 vertices, 3 uxw coords
		const adjusted = new Int8Array( generatedSurface.faces.length * 2 * 3 * 3 ); //2 faces per generated face, 3 vertices, 3 material inds
		const light = new Float32Array( generatedSurface.faces.length * 2 * 3 ); //2 faces per generated face, 3 vertices, 1 light value

		const stack = [];
		for ( let i = 0; i < lightIndices.length; i ++ ) {
			const intensity = lightIndices[i];
			if (intensity === 1) {
				const z = Math.floor(i / ( gridSize.x * gridSize.y ));
				const y = Math.floor((i - (z * ( gridSize.x * gridSize.y ))) / gridSize.z);
				const x = i -  (z * ( gridSize.x * gridSize.y )) - (y * gridSize.z);
				stack.push({ x, y, z, intensity: 2 });
				console.log(x,y,z,intensity)
			}
		}
		function lightFill3D(decayFactor) {	
			while (stack.length > 0) {
				const { x, y, z, intensity } = stack.pop();
				// console.log('i', intensity)
				// Check if coordinates are out of bounds
				if (x < 0 || x >= gridSize.x || y < 0 || y >= gridSize.y || z < 0 || z >= gridSize.z) {
					continue;
				}

				const p = ( z * ( gridSize.x * gridSize.y ) ) + ( Math.round( y ) * gridSize.z ) + x;
				// console.log(lightIndices[p], intensity)
				// If current intensity is lower than the stored value, skip
				if (lightIndices[p] >= intensity) {
					continue;
				}
				// Update voxel with the new intensity
				lightIndices[p] = intensity;
		
				// Calculate the new intensity after applying decay
				const newIntensity = intensity - decayFactor;
				// console.log('ni', intensity, decayFactor, newIntensity)
				// Push neighboring voxels onto the stack
				stack.push({ x: x + 1, y, z, intensity: newIntensity }); // Right
				stack.push({ x: x - 1, y, z, intensity: newIntensity }); // Left
				stack.push({ x, y: y + 1, z, intensity: newIntensity }); // Up
				stack.push({ x, y: y - 1, z, intensity: newIntensity }); // Down
				stack.push({ x, y, z: z + 1, intensity: newIntensity }); // Forward
				stack.push({ x, y, z: z - 1, intensity: newIntensity }); // Backward
			}
		}

		lightFill3D(0.1);

		const getMaterialLightValue = (v) => {
			x = Math.round( v[ 0 ] );
			y = v[ 1 ];
			z = Math.round( v[ 2 ] );
			terrainHeight = terrainHeights[ z * gridSize.x + x ];
			
			const p = ( z * ( gridSize.x * gridSize.y ) ) + ( Math.round( y ) * gridSize.z ) + x;
			const m = adjustedIndices[p];
			const l = lightIndices[p];
			return [m, l];
		};

		const generateVertexInfo = (i, j, v, m) => {
			vertices[ i + 0 ] = v[ 0 ];
			vertices[ i + 1 ] = v[ 1 ];
			vertices[ i + 2 ] = v[ 2 ];

			bary[ i + 0 ] = j === 0 ? 1 : 0;
			bary[ i + 1 ] = j === 1 ? 1 : 0;
			bary[ i + 2 ] = j === 2 ? 1 : 0;

			adjusted[ i + 0 ] = m[ 0 ];
			adjusted[ i + 1 ] = m[ 1 ];
			adjusted[ i + 2 ] = m[ 2 ];
		};

		const generateFaceInfo = (i, o, j) => {
			const f = generatedSurface.faces[ i ];

			const v0 = generatedSurface.vertices[ f[ j[0] ] ];
			const v1 = generatedSurface.vertices[ f[ j[1] ] ];
			const v2 = generatedSurface.vertices[ f[ j[2] ] ];

			const vi0 = i * 6 + (o) + 0;
			const vi1 = i * 6 + (o) + 1;
			const vi2 = i * 6 + (o) + 2;
			
			const [m0, l0] = getMaterialLightValue( v0 );
			const [m1, l1] = getMaterialLightValue( v1 );
			const [m2, l2] = getMaterialLightValue( v2 );

			generateVertexInfo(vi0 * 3, 0, v0, [m0, m1, m2]);
			generateVertexInfo(vi1 * 3, 1, v1, [m0, m1, m2]);
			generateVertexInfo(vi2 * 3, 2, v2, [m0, m1, m2]);

			indices[ i * 6 + o + 0 ] = vi0;
			indices[ i * 6 + o + 1 ] = vi1;
			indices[ i * 6 + o + 2 ] = vi2;

			light[ i * 6 + o + 0 ] = l0;
			light[ i * 6 + o + 1 ] = l1;
			light[ i * 6 + o + 2 ] = l2;
		};

		for ( let i = 0; i < generatedSurface.faces.length; i ++ ) {

			generateFaceInfo(i, 0, [1, 0, 2]);
			generateFaceInfo(i, 3, [3, 2, 0]);

		}

		self.postMessage(
			{
				indices,
				vertices,
				// underground,
				// topindices,
				// topvertices,
				adjusted,
				bary,
				light
			},
			[
				indices.buffer,
				vertices.buffer,
				// underground.buffer,
				// topindices.buffer,
				// topvertices.buffer,
				adjusted.buffer,
				bary.buffer,
				light.buffer
			]
		);

	} );

}
