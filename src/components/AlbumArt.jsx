import React, { useState, useEffect } from 'react';
import { getCachedArt, getAlbumArt } from '../utils/albumArt';

/**
 * Album art display component with lazy loading
 */
export function AlbumArt({ fileHandle, albumKey, size = 'md', className = '' }) {
  const [artUrl, setArtUrl] = useState(() => getCachedArt(albumKey));
  const [loading, setLoading] = useState(artUrl === undefined);
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    full: 'w-full h-full',
  };
  
  useEffect(() => {
    // If we already have a cached result (including null), don't fetch
    const cached = getCachedArt(albumKey);
    if (cached !== undefined) {
      setArtUrl(cached);
      setLoading(false);
      return;
    }
    
    // If no fileHandle, can't fetch
    if (!fileHandle) {
      setLoading(false);
      return;
    }
    
    let cancelled = false;
    
    const fetchArt = async () => {
      try {
        const url = await getAlbumArt(fileHandle, albumKey);
        if (!cancelled) {
          setArtUrl(url);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    fetchArt();
    
    return () => {
      cancelled = true;
    };
  }, [fileHandle, albumKey]);
  
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  
  if (loading) {
    return (
      <div className={`${sizeClass} ${className} bg-white/10 rounded animate-pulse flex items-center justify-center`}>
        <MusicIcon className="w-1/2 h-1/2 text-gray-600" />
      </div>
    );
  }
  
  if (!artUrl) {
    return (
      <div className={`${sizeClass} ${className} bg-gradient-to-br from-gray-700 to-gray-800 rounded flex items-center justify-center`}>
        <MusicIcon className="w-1/2 h-1/2 text-gray-500" />
      </div>
    );
  }
  
  return (
    <img 
      src={artUrl} 
      alt="Album art" 
      className={`${sizeClass} ${className} rounded object-cover`}
    />
  );
}

function MusicIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}
