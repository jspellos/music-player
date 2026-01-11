import Dexie from 'dexie';

export const db = new Dexie('JimMediaPlayer');

db.version(1).stores({
  tracks: '++id, path, title, artist, album, duration, folderHandle',
  queue: '++id, trackId, position',
  playlists: '++id, name, created',
  playlistTracks: '++id, playlistId, trackId, position',
  settings: 'key, value'
});

// Playlist helpers
export async function getPlaylists() {
  return db.playlists.orderBy('name').toArray();
}

export async function createPlaylist(name) {
  return db.playlists.add({ name, created: Date.now() });
}

export async function renamePlaylist(id, name) {
  return db.playlists.update(id, { name });
}

export async function deletePlaylist(id) {
  await db.playlistTracks.where('playlistId').equals(id).delete();
  return db.playlists.delete(id);
}

export async function getPlaylistTracks(playlistId) {
  const items = await db.playlistTracks
    .where('playlistId')
    .equals(playlistId)
    .sortBy('position');
  return items;
}

export async function savePlaylistTracks(playlistId, trackPaths) {
  // Clear existing tracks for this playlist
  await db.playlistTracks.where('playlistId').equals(playlistId).delete();
  
  // Add new tracks
  const items = trackPaths.map((path, index) => ({
    playlistId,
    trackPath: path,
    position: index
  }));
  
  await db.playlistTracks.bulkAdd(items);
}

export async function addTracksToPlaylist(playlistId, trackPaths) {
  const existing = await db.playlistTracks
    .where('playlistId')
    .equals(playlistId)
    .toArray();
  
  const maxPosition = existing.length > 0 
    ? Math.max(...existing.map(t => t.position)) + 1 
    : 0;
  
  const items = trackPaths.map((path, index) => ({
    playlistId,
    trackPath: path,
    position: maxPosition + index
  }));
  
  await db.playlistTracks.bulkAdd(items);
}

// Settings helpers
export async function getSetting(key, defaultValue = null) {
  const setting = await db.settings.get(key);
  return setting ? setting.value : defaultValue;
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

// Queue helpers
export async function getQueue() {
  const queueItems = await db.queue.orderBy('position').toArray();
  const trackIds = queueItems.map(q => q.trackId);
  const tracks = await db.tracks.bulkGet(trackIds);
  return queueItems.map((q, i) => ({ ...q, track: tracks[i] }));
}

export async function addToQueue(trackId) {
  const maxPos = await db.queue.orderBy('position').last();
  const position = maxPos ? maxPos.position + 1 : 0;
  return db.queue.add({ trackId, position });
}

export async function clearQueue() {
  return db.queue.clear();
}

export async function removeFromQueue(id) {
  return db.queue.delete(id);
}

export async function reorderQueue(items) {
  await db.transaction('rw', db.queue, async () => {
    await db.queue.clear();
    await db.queue.bulkAdd(items.map((item, index) => ({
      trackId: item.trackId,
      position: index
    })));
  });
}
