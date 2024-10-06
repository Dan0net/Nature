importScripts( "Noise.js" );

const continenal_spline = [
	[
		[ 0, 0.15 ],
		[ 0.1, 0.2 ],
	],
	[
		[ 0.1, 0.2 ],
		[ 0.2, 0.3 ],
	],
	[
		[ 0.2, 0.3 ],
		[ 0.3, 0.35 ],
	],
	[
		[ 0.3, 0.35 ],
		[ 0.5, 0.39 ],
	],
	[
		[ 0.5, 0.39 ],
		[ 0.6, 0.45 ],
	],
	[
		[ 0.6, 0.45 ],
		[ 0.85, 0.7 ],
	],
	[
		[ 0.85, 0.7 ],
		[ 0.90, 0.85 ],
	],
	[
		[ 0.90, 0.85 ],
		[ 1, 0.9 ],
	]
];
const bump_spline = [
	[
		[ 0, 0 ],
		[ 0.1, 0.002 ],
	],
	[
		[ 0.1, 0.002 ],
		[ 0.3, 0.01 ],
	],
	[
		[ 0.3, 0.01 ],
		[ 0.4, 0.025 ],
	],
	[
		[ 0.4, 0.025 ],
		[ 0.8, 0.22 ],
	],
	[
		[ 0.8, 0.22 ],
		[ 0.9, 0.42 ],
	],
	[
		[ 0.9, 0.42 ],
		[ 1, 0.36 ],
	]
];
const noise_3d_spline = [
	[
		[ 0, 0.7 ],
		[ 0.1, 0.6 ],
	],
	[
		[ 0.1, 0.6 ],
		[ 0.11, 0.2 ],
	],
	[
		[ 0.11, 0.2 ],
		[ 0.15, 0.1 ],
	],
	[
		[ 0.15, 0.1 ],
		[ 1, 0.0 ],
	]
];










// oooo d8b oooo  oooo  ooo. .oo.
// `888""8P `888  `888  `888P"Y88b
//  888      888   888   888   888
//  888      888   888   888   888
// d888b     `V88V"V8P' o888o o888o


self.onmessage = async ( { data } ) => {

	if ( data.options ) {

		console.log( '> Seed: ' + data.options.terrainSeed );
		noiseSeed( data.options.terrainSeed );
		return;

	}

	generateGrid( data );

};

function generateGrid( { gridSize, terrainScale, offset } ) {

	const grid = new Float32Array( gridSize.x * gridSize.y * gridSize.z ).fill( - 0.5 );
	const terrainHeights = new Float32Array( gridSize.x * gridSize.z );

	const setGridValue = ( x, y, z, value ) => {

		const gridOffset = ( ( z * ( gridSize.x * gridSize.y ) ) + ( y * gridSize.z ) + x );
		grid[ gridOffset ] = value;

	};

	const ground = 0;
	const yOffset = offset.y * gridSize.y;
	console.log(yOffset)

	for ( var x = 0; x < gridSize.x; x ++ ) {

		for ( var z = 0; z < gridSize.z; z ++ ) {

			terrainHeights[ x + z * gridSize.x ] = 20;

			for ( var y = 0; y < gridSize.y; y ++ ) {

				setGridValue( x, y, z, y + yOffset < 20 ? 0.5 : -0.5 );

			}

		}

	}

	self.postMessage( { grid, terrainHeights }, [ grid.buffer, terrainHeights.buffer ] );

}





function getValue( x, y, z, offset, gridSize, terrainScale, terrainHeight ) {

	let terrainHeightValue = y < terrainHeight ? 0.2 : map( y - terrainHeight, 0, 2, 0.5, - 0.5, true );

	//3d noise
	const noise_3d_scale = 0.025;
	const noise_3d = noise(
		5999737664 + ( x + offset.x * ( gridSize.x - 1 ) - offset.x ) * noise_3d_scale * terrainScale.x,
		5903854664 + ( y * ( gridSize.y - 1 ) ) * ( noise_3d_scale * 0.01 ) * terrainScale.y,
		5999111164 + ( z + offset.z * ( gridSize.z - 1 ) - offset.z ) * noise_3d_scale * terrainScale.z,
	);

	const density_3d = noise_3d + mapSplineNoise( ( Math.abs( y - terrainHeight ) / ( gridSize.y * 0.5 ) ) + 0.001, noise_3d_spline );
	const density_3d_value = map( density_3d, 1, 0, 0.5, - 0.5 );

	//caves and tunnels
	if ( y < terrainHeight * 1.05 && y > 5 ) {

		// caves
		const scale = 0.03;
		const d = noise(
			5999737664 + ( x + offset.x * ( gridSize.x - 1 ) - offset.x ) * scale * terrainScale.x,
			5903854664 + ( y * ( gridSize.y - 1 ) ) * ( scale * 0.01 ) * terrainScale.y,
			5999111164 + ( z + offset.z * ( gridSize.z - 1 ) - offset.z ) * scale * terrainScale.z,
		);
		if ( d < 0.33 ) terrainHeightValue = map( d, 0, 0.33, 0.5, - 0.5, true );

		//tunnels
		const scale2 = 0.025;
		let d2 = Math.abs( noise(
			5999737664 + ( x + offset.x * ( gridSize.x - 1 ) - offset.x ) * scale2 * terrainScale.x,
			5903854664 + ( y * ( gridSize.y - 1 ) ) * ( scale2 * 0.008 ) * terrainScale.y,
			5999111164 + ( z + offset.z * ( gridSize.z - 1 ) - offset.z ) * scale2 * terrainScale.z,
		) * 2 - 1 );
		d2 = Math.pow( 1.0 - d2, 3 );
		if ( d2 > 0.7 ) terrainHeightValue = map( d2, 0.7, 1, 0.5, - 0.5, true );

	} else if ( y < 5 ) {

		terrainHeightValue = 0.5;

	}

	return constrain( terrainHeightValue + density_3d_value, - 0.5, 0.5 );

}




function mapSplineNoise( noise, spline ) {

	let range;
	for ( let i = 0; i < spline.length; i ++ ) {

		if ( noise > spline[ i ][ 0 ][ 0 ] && noise < spline[ i ][ 1 ][ 0 ] ) {

			range = spline[ i ];
			break;

		}

	}
	return range ? map( noise, range[ 0 ][ 0 ], range[ 1 ][ 0 ], range[ 0 ][ 1 ], range[ 1 ][ 1 ] ) : 0;

}

function constrain( n, low, high ) {

	return Math.max( Math.min( n, high ), low );

}

function map( n, start1, stop1, start2, stop2, withinBounds ) {

	const newval = ( n - start1 ) / ( stop1 - start1 ) * ( stop2 - start2 ) + start2;
	if ( ! withinBounds ) {

		return newval;

	}
	if ( start2 < stop2 ) {

		return constrain( newval, start2, stop2 );

	} else {

		return constrain( newval, stop2, start2 );

	}

}
