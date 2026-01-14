import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { organizeByArtistAlbum, searchTracks } from '../utils/fileScanner';
import { AlbumArt } from './AlbumArt';

export function LibraryBrowser({ tracks, onPlayTrack, onAddToQueue, onAddAlbumToQueue, getFileHandle }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState(''); // Only search when Enter is pressed
  const [expandedArtists, setExpandedArtists] = useState(new Set());
  const [expandedAlbums, setExpandedAlbums] = useState(new Set());
  const [selectedArtist, setSelectedArtist] = useState(null); // Artist to show at top

  const organized = useMemo(() => organizeByArtistAlbum(tracks), [tracks]);
  const artists = useMemo(() => Object.keys(organized).sort(), [organized]);

  // Search results include both artists and tracks
  const searchResults = useMemo(() => {
    if (!activeSearch.trim()) return null;
    
    const query = activeSearch.toLowerCase();
    
    // Find matching artists
    const matchingArtists = artists.filter(artist => 
      artist.toLowerCase().includes(query)
    );
    
    // Find matching tracks
    const matchingTracks = searchTracks(tracks, activeSearch);
    
    return {
      artists: matchingArtists,
      tracks: matchingTracks
    };
  }, [tracks, artists, activeSearch]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      setActiveSearch(searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setExpandedArtists(new Set()); // Return to grid view
  };

  const toggleArtist = (artist) => {
    setExpandedArtists(prev => {
      const next = new Set(prev);
      if (next.has(artist)) {
        next.delete(artist);
      } else {
        next.add(artist);
      }
      return next;
    });
    
    // If expanding, set this artist as the selected one to show at top
    if (!expandedArtists.has(artist)) {
      setSelectedArtist(artist);
      // Scroll to top after render
      setTimeout(() => {
        const scrollContainer = document.getElementById('library-scroll-container');
        if (scrollContainer) scrollContainer.scrollTop = 0;
      }, 0);
    }
  };

  const toggleAlbum = (albumKey) => {
    setExpandedAlbums(prev => {
      const next = new Set(prev);
      if (next.has(albumKey)) {
        next.delete(albumKey);
      } else {
        next.add(albumKey);
      }
      return next;
    });
  };

  const addAlbumToQueue = (artist, album) => {
    const albumTracks = organized[artist][album];
    onAddAlbumToQueue(albumTracks);
  };

  const getAlbumTracks = (artist, album) => {
    return organized[artist][album];
  };

  // Check if any artist is expanded
  const hasExpandedArtist = expandedArtists.size > 0;

  return (
    <div className="h-full flex flex-col glass-panel border-r border-white/10">
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <input
            type="text"
            placeholder="Search library... (press Enter)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full px-3 py-2 pr-8 bg-white/5 border border-white/20 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          {activeSearch && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      <div id="library-scroll-container" className="flex-1 overflow-y-auto">
        {searchResults ? (
          <div className="p-2">
            <div className="text-sm text-gray-400 mb-2 px-2 flex justify-between items-center">
              <span>
                {searchResults.artists.length} artist{searchResults.artists.length !== 1 ? 's' : ''}, {searchResults.tracks.length} track{searchResults.tracks.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={clearSearch}
                className="text-teal-400 hover:text-teal-300 text-sm"
              >
                Clear
              </button>
            </div>
            
            {/* Matching Artists */}
            {searchResults.artists.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">Artists</div>
                <div className="grid grid-cols-4 gap-2">
                  {searchResults.artists.map(artist => (
                    <button
                      key={artist}
                      onClick={() => {
                        clearSearch();
                        toggleArtist(artist);
                      }}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-all border border-orange-500/30 hover:border-orange-500/60 hover:shadow-[0_0_15px_rgba(255,165,0,0.3)]"
                    >
                      <div className="font-medium text-gray-200 truncate text-sm">{artist}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Object.keys(organized[artist]).length} album{Object.keys(organized[artist]).length !== 1 ? 's' : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Matching Tracks */}
            {searchResults.tracks.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase px-2 mb-2">Tracks</div>
                <div className="grid grid-cols-1 gap-1">
                  {searchResults.tracks.map((track) => (
                    <DraggableTrackRow 
                      key={track.id} 
                      track={track} 
                      onPlay={onPlayTrack} 
                      onAdd={onAddToQueue}
                      showArtist
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2">
            {/* Grid view when no artist is expanded */}
            {!hasExpandedArtist ? (
              <div className="grid grid-cols-4 gap-2">
                {artists.map(artist => {
                  // Get first album's first track for album art
                  const firstAlbum = Object.keys(organized[artist]).sort()[0];
                  const firstTrack = organized[artist][firstAlbum]?.[0];
                  const albumKey = `${artist}/${firstAlbum}`;
                  const fileHandle = firstTrack ? getFileHandle(firstTrack.id) : null;
                  
                  return (
                    <button
                      key={artist}
                      onClick={() => toggleArtist(artist)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-left transition-all border border-orange-500/30 hover:border-orange-500/60 hover:shadow-[0_0_15px_rgba(255,165,0,0.3)] card-hover flex flex-col items-center"
                    >
                      <AlbumArt 
                        fileHandle={fileHandle} 
                        albumKey={albumKey}
                        size="lg" 
                        className="mb-2 shadow-lg"
                      />
                      <div className="font-medium text-gray-200 truncate text-sm w-full text-center">{artist}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Object.keys(organized[artist]).length} album{Object.keys(organized[artist]).length !== 1 ? 's' : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* List view when an artist is expanded */
              <div>
                {/* Sticky back button */}
                <div className="sticky top-0 glass-panel z-10 pb-2 border-b border-white/10 mb-2">
                  <button
                    onClick={() => {
                      setExpandedArtists(new Set());
                      setSelectedArtist(null);
                    }}
                    className="px-3 py-1.5 text-sm text-teal-400 hover:bg-white/10 rounded-lg flex items-center gap-2"
                  >
                    <span>←</span>
                    <span>Back to all artists</span>
                  </button>
                </div>
                
                {/* Sort artists with selected artist first */}
                {(() => {
                  const sortedArtists = selectedArtist 
                    ? [selectedArtist, ...artists.filter(a => a !== selectedArtist)]
                    : artists;
                  
                  return sortedArtists.map(artist => (
                    <div key={artist} className="mb-1">
                      <button
                        onClick={() => toggleArtist(artist)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left ${
                          expandedArtists.has(artist) ? 'bg-teal-500/20 hover:bg-teal-500/30' : 'hover:bg-white/10'
                        }`}
                      >
                        <span className="text-gray-500 text-xs w-4">
                          {expandedArtists.has(artist) ? '▼' : '▶'}
                        </span>
                        <span className="font-medium text-gray-200 truncate">{artist}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {Object.keys(organized[artist]).length} albums
                        </span>
                      </button>
                      
                      {expandedArtists.has(artist) && (
                        <div className="ml-4 mt-1">
                          {Object.keys(organized[artist]).sort().map(album => {
                            const albumKey = `${artist}/${album}`;
                            const albumTracks = getAlbumTracks(artist, album);
                            return (
                              <div key={albumKey} className="mb-1">
                                <DraggableAlbumRow
                                  artist={artist}
                                  album={album}
                                  albumKey={albumKey}
                                  trackCount={albumTracks.length}
                                  tracks={albumTracks}
                                  isExpanded={expandedAlbums.has(albumKey)}
                                  onToggle={() => toggleAlbum(albumKey)}
                                  onAddToQueue={() => addAlbumToQueue(artist, album)}
                                  getFileHandle={getFileHandle}
                                />
                                
                                {expandedAlbums.has(albumKey) && (
                                  <div className="ml-6">
                                    {albumTracks.map((track) => (
                                      <DraggableTrackRow 
                                        key={track.id} 
                                        track={track} 
                                        onPlay={onPlayTrack} 
                                        onAdd={onAddToQueue}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableAlbumRow({ artist, album, albumKey, trackCount, tracks, isExpanded, onToggle, onAddToQueue, getFileHandle }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `album-${albumKey}`,
    data: { album: { artist, album, tracks } }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Get first track's file handle for album art
  const firstTrack = tracks[0];
  const fileHandle = firstTrack ? getFileHandle(firstTrack.id) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none p-1"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <AlbumArt 
        fileHandle={fileHandle} 
        albumKey={albumKey}
        size="sm" 
        className="flex-shrink-0"
      />
      <button
        onClick={onToggle}
        className="flex-1 flex items-center gap-2 px-2 py-1 hover:bg-white/10 rounded text-left"
      >
        <span className="text-gray-500 text-xs w-4">
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="text-gray-300 truncate">{album}</span>
        <span className="text-xs text-gray-500 ml-auto">
          {trackCount}
        </span>
      </button>
      <button
        onClick={onAddToQueue}
        className="p-1 hover:bg-teal-500/20 rounded text-teal-400"
        title="Add album to queue"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

function DraggableTrackRow({ track, onPlay, onAdd, showArtist }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `library-${track.id}`,
    data: { track }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-1 hover:bg-white/10 rounded group ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <button
        onClick={() => onPlay(track)}
        className="flex-1 text-left truncate text-gray-300 hover:text-teal-400 flex items-center gap-1"
      >
        {track.isVideo && <VideoIcon />}
        <span className="truncate">{track.title}</span>
        {showArtist && (
          <span className="text-gray-500 text-sm ml-2">— {track.artist}</span>
        )}
      </button>
      <button
        onClick={() => onAdd(track)}
        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-teal-500/20 rounded text-teal-400 transition-opacity"
        title="Add to queue"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

function GripIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
