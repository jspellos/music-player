import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { organizeByArtistAlbum, searchTracks } from '../utils/fileScanner';

export function LibraryBrowser({ tracks, onPlayTrack, onAddToQueue, onAddAlbumToQueue }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedArtists, setExpandedArtists] = useState(new Set());
  const [expandedAlbums, setExpandedAlbums] = useState(new Set());

  const organized = useMemo(() => organizeByArtistAlbum(tracks), [tracks]);
  const artists = useMemo(() => Object.keys(organized).sort(), [organized]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return searchTracks(tracks, searchQuery);
  }, [tracks, searchQuery]);

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

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="p-3 border-b border-gray-200">
        <input
          type="text"
          placeholder="Search library..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {searchResults ? (
          <div className="p-2">
            <div className="text-sm text-gray-500 mb-2 px-2">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
            {searchResults.map((track) => (
              <DraggableTrackRow 
                key={track.id} 
                track={track} 
                onPlay={onPlayTrack} 
                onAdd={onAddToQueue}
                showArtist
              />
            ))}
          </div>
        ) : (
          <div className="p-2">
            {artists.map(artist => (
              <div key={artist} className="mb-1">
                <button
                  onClick={() => toggleArtist(artist)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded text-left"
                >
                  <span className="text-gray-400 text-xs w-4">
                    {expandedArtists.has(artist) ? '▼' : '▶'}
                  </span>
                  <span className="font-medium text-gray-800 truncate">{artist}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {Object.keys(organized[artist]).length} albums
                  </span>
                </button>
                
                {expandedArtists.has(artist) && (
                  <div className="ml-4">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableAlbumRow({ artist, album, albumKey, trackCount, tracks, isExpanded, onToggle, onAddToQueue }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `album-${albumKey}`,
    data: { album: { artist, album, tracks } }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none p-1"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <button
        onClick={onToggle}
        className="flex-1 flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded text-left"
      >
        <span className="text-gray-400 text-xs w-4">
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="text-gray-700 truncate">{album}</span>
        <span className="text-xs text-gray-400 ml-auto">
          {trackCount}
        </span>
      </button>
      <button
        onClick={onAddToQueue}
        className="p-1 hover:bg-blue-100 rounded text-blue-600"
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
      className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-100 rounded group ${isDragging ? 'opacity-50' : ''}`}
    >
      <button
        className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <button
        onClick={() => onPlay(track)}
        className="flex-1 text-left truncate text-gray-700 hover:text-blue-600 flex items-center gap-1"
      >
        {track.isVideo && <VideoIcon />}
        <span className="truncate">{track.title}</span>
        {showArtist && (
          <span className="text-gray-400 text-sm ml-2">— {track.artist}</span>
        )}
      </button>
      <button
        onClick={() => onAdd(track)}
        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-blue-100 rounded text-blue-600 transition-opacity"
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
