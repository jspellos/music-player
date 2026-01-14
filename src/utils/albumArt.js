import * as musicMetadata from 'music-metadata-browser';

// Cache for album art URLs (blob URLs)
const artCache = new Map();

// Cache for pending requests (to avoid duplicate extractions)
const pendingRequests = new Map();

/**
 * Extract album art from an audio file
 * @param {FileSystemFileHandle} fileHandle - The file handle to read from
 * @returns {Promise<string|null>} - Blob URL of the album art, or null if none found
 */
export async function extractAlbumArt(fileHandle) {
  if (!fileHandle) {
    return null;
  }
  
  const cacheKey = fileHandle.name;
  
  // Return cached result if available
  if (artCache.has(cacheKey)) {
    return artCache.get(cacheKey);
  }
  
  // If already fetching this file, wait for that request
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Create a promise for this request
  const promise = (async () => {
    try {
      const file = await fileHandle.getFile();
      
      // Parse with options to get picture
      const metadata = await musicMetadata.parseBlob(file, {
        skipCovers: false
      });
      
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        const blob = new Blob([picture.data], { type: picture.format });
        const url = URL.createObjectURL(blob);
        artCache.set(cacheKey, url);
        return url;
      }
      
      // No embedded art found
      artCache.set(cacheKey, null);
      return null;
    } catch (error) {
      // Silently fail - many files won't have embedded art
      artCache.set(cacheKey, null);
      return null;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();
  
  pendingRequests.set(cacheKey, promise);
  return promise;
}

/**
 * Get album art for a track, with caching by album
 * @param {FileSystemFileHandle} fileHandle - The file handle
 * @param {string} albumKey - Unique key for the album (artist/album)
 * @returns {Promise<string|null>} - Blob URL of the album art
 */
export async function getAlbumArt(fileHandle, albumKey) {
  // Check album-level cache first
  if (artCache.has(albumKey)) {
    return artCache.get(albumKey);
  }
  
  const artUrl = await extractAlbumArt(fileHandle);
  
  // Cache at album level too
  if (artUrl) {
    artCache.set(albumKey, artUrl);
  }
  
  return artUrl;
}

/**
 * Clear all cached album art (call when changing music folders)
 */
export function clearArtCache() {
  // Revoke blob URLs to free memory
  for (const url of artCache.values()) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
  artCache.clear();
  pendingRequests.clear();
}

/**
 * Get art from cache only (synchronous, for initial render)
 * @param {string} key - Cache key (filename or albumKey)
 * @returns {string|null|undefined} - URL if cached, null if checked and not found, undefined if not yet checked
 */
export function getCachedArt(key) {
  return artCache.get(key);
}
