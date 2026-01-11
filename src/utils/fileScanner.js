import { db } from '../stores/db';

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.wma'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v'];
const MEDIA_EXTENSIONS = [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS];

export function isVideoFile(filename) {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return VIDEO_EXTENSIONS.includes(ext);
}

export function isAudioFile(filename) {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return AUDIO_EXTENSIONS.includes(ext);
}

export async function scanDirectory(directoryHandle, onProgress) {
  const tracks = [];
  let scanned = 0;
  
  async function scanFolder(handle, path = '') {
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') {
        const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf('.'));
        if (MEDIA_EXTENSIONS.includes(ext)) {
          // Parse artist/album from path
          const pathParts = path.split('/').filter(Boolean);
          const artist = pathParts[0] || 'Unknown Artist';
          const album = pathParts[1] || 'Unknown Album';
          const title = entry.name.replace(/\.[^/.]+$/, '');
          const isVideo = VIDEO_EXTENSIONS.includes(ext);
          
          tracks.push({
            path: path + '/' + entry.name,
            title,
            artist,
            album,
            fileHandle: entry,
            duration: 0,
            isVideo
          });
          
          scanned++;
          if (onProgress) {
            onProgress(scanned);
          }
        }
      } else if (entry.kind === 'directory') {
        await scanFolder(entry, path + '/' + entry.name);
      }
    }
  }
  
  await scanFolder(directoryHandle);
  return tracks;
}

export async function saveTracksToDb(tracks) {
  await db.tracks.clear();
  await db.tracks.bulkAdd(tracks.map(t => ({
    path: t.path,
    title: t.title,
    artist: t.artist,
    album: t.album,
    duration: t.duration
  })));
}

export function organizeByArtistAlbum(tracks) {
  const organized = {};
  
  for (const track of tracks) {
    if (!organized[track.artist]) {
      organized[track.artist] = {};
    }
    if (!organized[track.artist][track.album]) {
      organized[track.artist][track.album] = [];
    }
    organized[track.artist][track.album].push(track);
  }
  
  // Sort albums and tracks
  for (const artist of Object.keys(organized)) {
    for (const album of Object.keys(organized[artist])) {
      organized[artist][album].sort((a, b) => a.title.localeCompare(b.title));
    }
  }
  
  return organized;
}

export function searchTracks(tracks, query) {
  const lower = query.toLowerCase();
  return tracks.filter(t => 
    t.title.toLowerCase().includes(lower) ||
    t.artist.toLowerCase().includes(lower) ||
    t.album.toLowerCase().includes(lower)
  );
}
