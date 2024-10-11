import InstancedLOD from '../../../libraries/instanced-lod/InstancedLOD';

export default class CachedInstancedLOD extends InstancedLOD {

	constructor() {

		super();
		this.cachedData = {};
		this.needsUpdate = true;

	}

	update( position ) {

		super.update( position );
		const currentCoord = this.terrain.getCoordFromPosition( position );

		for ( let key in this.cachedData ) {

			const chunk = this.terrain.getChunk( key );
			if ( ! chunk ||
                 Math.abs( chunk.offset.x - currentCoord.x ) > this.viewDistance ||
                 Math.abs( chunk.offset.y - currentCoord.y ) > this.viewDistance ||
                 Math.abs( chunk.offset.z - currentCoord.z ) > this.viewDistance ) {

				// delete this.cachedData[ key ];

			}

		}

		this.needsUpdate = false;

	}

	hasData( chunkKey ) {

		// console.log(chunkKey, this.cachedData[ chunkKey ])

		return this.cachedData[ chunkKey ] != undefined;

	}

	addData( data ) {

		this.addMatrices( data );

	}

	addCachedData( chunkKey ) {

		this.addData( this.cachedData[ chunkKey ] );

	}

	addDataToCache ( data, chunkKey ) {
		this.addData ( data );
		this.cachedData[ chunkKey ] = [];
		for ( let matrix of data ) {

			this.cachedData[ chunkKey ].push( matrix );

		}
		console.log(chunkKey, this.cachedData[ chunkKey ])
	}

	removeCachedData( chunkKey ) {
		console.log(chunkKey)

		delete this.cachedData[ chunkKey ];

	}

	addChunkData( chunk ) {
		const chunkKey = chunk.chunkKey;
		// console.log(chunkKey)

		if ( ! this.cachedData[ chunkKey ] ) {

			this.cachedData[ chunkKey ] = this.generateData( chunk );

		}

		this.addData( this.cachedData[ chunkKey ] );

	}


	removeMatricesOnDistanceFromPoint( chunkKey, point, distance ) {

		if ( ! this.cachedData[ chunkKey ] ) return;

		const p = new THREE.Vector3();
		let changes = false;

		function checkData( array ) {

			return array.filter( data =>{

				p.setFromMatrixPosition( data );
				const keep = ( p.distanceToSquared( point ) > distance * distance * 25 );
				if ( ! keep ) changes = true;
				return keep;

			} );

		}

		this.cachedData[ chunkKey ] = checkData( this.cachedData[ chunkKey ] );
		this.needsUpdate = changes;

	}

}
