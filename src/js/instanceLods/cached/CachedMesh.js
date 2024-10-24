import * as THREE from 'three';

export default class CachedMesh extends THREE.Mesh {

	constructor( geometry, material ) {

		super( geometry, material );
		this.cachedData = {};
		this.needsUpdate = true;

	}

	animate() {}
	clearData() {}
	addData() {}
	removeData() {}

	dispose() {

		this.geometry.dispose();
		this.material.dispose();
		this.parent.remove( this );

	}

	update( position ) {

		const currentCoord = this.terrain.getCoordFromPosition( position );

		for ( let chunkKey in this.cachedData ) {

			const chunk = this.terrain.getChunk( chunkKey );
			if ( ! chunk ||
                 Math.abs( chunk.offset.x - currentCoord.x ) > this.viewDistance ||
                 Math.abs( chunk.offset.z - currentCoord.z ) > this.viewDistance ) {

				this.removeData( chunkKey );
				delete this.cachedData[ chunkKey ];

			}

		}

		this.needsUpdate = false;

	}

	hasData( chunkKey ) {

		return this.cachedData[ chunkKey ] != undefined;

	}

	addCachedData( chunkKey ) {

		this.addData( chunkKey );

	}

	removeCachedData( chunkKey ) {

		delete this.cachedData[ chunkKey ];

	}

	addChunkData( chunk ) {

		const chunkKey = chunk.chunkKey;
		if ( ! this.cachedData[ chunkKey ] ) {

			const data = this.generateData( chunk );
			if ( data ) {

				this.cachedData[ chunkKey ] = data;
				this.addData( chunkKey );

			}

		}

	}

}
