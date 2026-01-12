import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DndContext, DragOverlay, pointerWithin, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { LibraryBrowser } from './components/LibraryBrowser';
import { NowPlayingQueue } from './components/NowPlayingQueue';
import { PlayerControls } from './components/PlayerControls';
import { Equalizer } from './components/Equalizer';
import { PlaylistPanel } from './components/PlaylistPanel';
import { VideoPlayer } from './components/VideoPlayer';
import { scanDirectory } from './utils/fileScanner';
import { getSetting, setSetting } from './stores/db';
import { audioEngine } from './utils/audioEngine';

// Detect if we're on mobile or if File System Access API is not supported
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const hasFileSystemAccess = 'showDirectoryPicker' in window;
const useFallbackPicker = isMobile || !hasFileSystemAccess;

function App() {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showEQ, setShowEQ] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [hasFolder, setHasFolder] = useState(false);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  
  // Queue state - stores full track objects
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  
  // Drag state
  const [activeDragItem, setActiveDragItem] = useState(null);
  
  // Resizable panel state
  const [libraryWidth, setLibraryWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  
  // File handles stored in memory (can't persist these)
  const fileHandlesRef = useRef(new Map());
  
  // Fallback file input for mobile
  const fileInputRef = useRef(null);
  
  // Refs to access current state in callbacks
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  
  useEffect(() => {
    queueIndexRef.current = queueIndex;
  }, [queueIndex]);
  
  // Load saved library width
  useEffect(() => {
    getSetting('library_width', 320).then(w => setLibraryWidth(w));
  }, []);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );
  
  // Resizer handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);
  
  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e) => {
      const newWidth = Math.max(200, Math.min(600, e.clientX));
      setLibraryWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      setSetting('library_width', libraryWidth);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, libraryWidth]);

  const playTrackInternal = async (track, fileHandle) => {
    try {
      const isVideo = track.isVideo || false;
      await audioEngine.loadTrack(fileHandle, isVideo);
      audioEngine.play();
      
      // Get and store the duration
      const trackDuration = audioEngine.getDuration();
      
      // Update the track in the queue with its duration
      setQueue(currentQueue => 
        currentQueue.map(t => 
          t.id === track.id ? { ...t, duration: trackDuration } : t
        )
      );
      
      setCurrentTrack({ ...track, duration: trackDuration });
      setIsPlaying(true);
      setIsVideoPlaying(isVideo);
      setDuration(trackDuration);
      setCurrentTime(0);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  // Handle next track when song ends
  const handleAutoNext = useCallback(() => {
    const currentQueue = queueRef.current;
    const currentIndex = queueIndexRef.current;
    
    const nextIndex = currentIndex + 1;
    if (nextIndex < currentQueue.length) {
      const nextTrack = currentQueue[nextIndex];
      const fileHandle = fileHandlesRef.current.get(nextTrack.id);
      if (fileHandle) {
        setQueueIndex(nextIndex);
        playTrackInternal(nextTrack, fileHandle);
      }
    } else {
      setIsPlaying(false);
      setQueueIndex(-1);
    }
  }, []);

  // Set up audio engine callbacks
  useEffect(() => {
    audioEngine.onTimeUpdate((time) => {
      setCurrentTime(time);
    });

    audioEngine.onEnded(() => {
      handleAutoNext();
    });

    // Load saved volume
    getSetting('volume', 80).then(v => {
      setVolume(v);
      audioEngine.setVolume(v);
    });

    return () => {
      audioEngine.dispose();
    };
  }, [handleAutoNext]);

  const selectFolder = async () => {
    if (useFallbackPicker) {
      // Trigger the hidden file input for mobile
      fileInputRef.current?.click();
      return;
    }
    
    // Desktop: use File System Access API
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'read'
      });
      
      setIsLoading(true);
      setScanProgress(0);
      fileHandlesRef.current.clear();
      
      const scannedTracks = await scanDirectory(handle, (count) => {
        setScanProgress(count);
      });
      
      // Build tracks with IDs and collect file handles
      const tracksWithIds = [];
      let id = 1;
      
      const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.wma'];
      const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v'];
      const MEDIA_EXTENSIONS = [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS];
      
      async function collectHandles(dirHandle, path = '') {
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const ext = entry.name.toLowerCase().slice(entry.name.lastIndexOf('.'));
            if (MEDIA_EXTENSIONS.includes(ext)) {
              const fullPath = path + '/' + entry.name;
              const track = scannedTracks.find(t => t.path === fullPath);
              if (track) {
                track.id = id++;
                track.isVideo = VIDEO_EXTENSIONS.includes(ext);
                fileHandlesRef.current.set(track.id, entry);
                tracksWithIds.push(track);
              }
            }
          } else if (entry.kind === 'directory') {
            await collectHandles(entry, path + '/' + entry.name);
          }
        }
      }
      
      await collectHandles(handle);
      
      setTracks(tracksWithIds);
      setHasFolder(true);
      setIsLoading(false);
      setQueue([]);
      setQueueIndex(-1);
      setCurrentTrack(null);
      setIsPlaying(false);
      setIsVideoPlaying(false);
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error selecting folder:', error);
      }
      setIsLoading(false);
    }
  };

  // Handle mobile file input change
  const handleMobileFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    setIsLoading(true);
    setScanProgress(0);
    fileHandlesRef.current.clear();
    
    const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac', '.wma'];
    const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v'];
    const MEDIA_EXTENSIONS = [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS];
    
    const tracksWithIds = [];
    let id = 1;
    
    for (const file of files) {
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      if (MEDIA_EXTENSIONS.includes(ext)) {
        // Parse path from webkitRelativePath
        const relativePath = file.webkitRelativePath || file.name;
        const pathParts = relativePath.split('/').filter(Boolean);
        
        // Artist is first folder, album is second (if exists)
        const artist = pathParts.length > 2 ? pathParts[1] : (pathParts.length > 1 ? pathParts[0] : 'Unknown Artist');
        const album = pathParts.length > 2 ? pathParts[2] : (pathParts.length > 1 ? pathParts[1] : 'Unknown Album');
        const title = file.name.replace(/\.[^/.]+$/, '');
        const isVideo = VIDEO_EXTENSIONS.includes(ext);
        
        const track = {
          id: id++,
          path: '/' + relativePath,
          title,
          artist,
          album,
          isVideo,
          duration: 0,
          file // Store the File object directly for mobile
        };
        
        fileHandlesRef.current.set(track.id, file);
        tracksWithIds.push(track);
        setScanProgress(tracksWithIds.length);
      }
    }
    
    setTracks(tracksWithIds);
    setHasFolder(true);
    setIsLoading(false);
    setQueue([]);
    setQueueIndex(-1);
    setCurrentTrack(null);
    setIsPlaying(false);
    setIsVideoPlaying(false);
    
    // Clear the input so the same folder can be selected again
    event.target.value = '';
  };

  const handlePlayTrack = useCallback((track) => {
    const fileHandle = fileHandlesRef.current.get(track.id);
    if (!fileHandle) {
      console.error('No file handle for track', track.id);
      return;
    }
    
    setQueue(currentQueue => {
      // Check if already in queue
      const existingIndex = currentQueue.findIndex(t => t.id === track.id);
      if (existingIndex >= 0) {
        // Already in queue, just play it
        setQueueIndex(existingIndex);
        playTrackInternal(track, fileHandle);
        return currentQueue;
      } else {
        // Add to end and play
        const newQueue = [...currentQueue, track];
        setQueueIndex(newQueue.length - 1);
        playTrackInternal(track, fileHandle);
        return newQueue;
      }
    });
  }, []);

  const handleAddToQueue = useCallback((track) => {
    setQueue(currentQueue => {
      // Don't add duplicates
      if (currentQueue.some(t => t.id === track.id)) {
        return currentQueue;
      }
      return [...currentQueue, track];
    });
  }, []);

  const handleAddAlbumToQueue = useCallback((albumTracks) => {
    setQueue(currentQueue => {
      // Filter out duplicates
      const newTracks = albumTracks.filter(
        track => !currentQueue.some(t => t.id === track.id)
      );
      return [...currentQueue, ...newTracks];
    });
  }, []);

  const handleRemoveFromQueue = useCallback((trackId) => {
    setQueue(currentQueue => {
      const index = currentQueue.findIndex(t => t.id === trackId);
      if (index === -1) return currentQueue;
      
      const newQueue = currentQueue.filter(t => t.id !== trackId);
      
      setQueueIndex(currentIndex => {
        if (newQueue.length === 0) {
          setIsPlaying(false);
          setCurrentTrack(null);
          audioEngine.stop();
          return -1;
        }
        
        if (index < currentIndex) {
          return currentIndex - 1;
        } else if (index === currentIndex) {
          // Currently playing track was removed
          if (index < newQueue.length) {
            const nextTrack = newQueue[index];
            const fileHandle = fileHandlesRef.current.get(nextTrack.id);
            if (fileHandle) playTrackInternal(nextTrack, fileHandle);
            return index;
          } else {
            const prevTrack = newQueue[newQueue.length - 1];
            const fileHandle = fileHandlesRef.current.get(prevTrack.id);
            if (fileHandle) playTrackInternal(prevTrack, fileHandle);
            return newQueue.length - 1;
          }
        }
        return currentIndex;
      });
      
      return newQueue;
    });
  }, []);

  const handleReorderQueue = useCallback((newQueue) => {
    setQueue(newQueue);
    // Update queue index to follow the current track
    setQueueIndex(currentIndex => {
      if (currentIndex === -1) return -1;
      const currentId = queueRef.current[currentIndex]?.id;
      if (currentId) {
        const newIndex = newQueue.findIndex(t => t.id === currentId);
        return newIndex;
      }
      return currentIndex;
    });
  }, []);

  const handleClearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
    setCurrentTrack(null);
    setIsPlaying(false);
    setIsVideoPlaying(false);
    audioEngine.stop();
  }, []);

  const handlePlayFromQueue = useCallback((index) => {
    setQueue(currentQueue => {
      const track = currentQueue[index];
      if (!track) return currentQueue;
      
      const fileHandle = fileHandlesRef.current.get(track.id);
      if (fileHandle) {
        setQueueIndex(index);
        playTrackInternal(track, fileHandle);
      }
      return currentQueue;
    });
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      if (currentTrack) {
        audioEngine.play();
        setIsPlaying(true);
      } else if (queue.length > 0) {
        handlePlayFromQueue(0);
      }
    }
  }, [isPlaying, currentTrack, queue.length, handlePlayFromQueue]);

  const handleSeek = useCallback((time) => {
    audioEngine.seek(time);
    setCurrentTime(time);
  }, []);

  const handleVolumeChange = useCallback((value) => {
    setVolume(value);
    audioEngine.setVolume(value);
    setSetting('volume', value);
  }, []);

  const handlePrevious = useCallback(() => {
    if (currentTime > 3) {
      handleSeek(0);
      return;
    }
    
    if (queueIndex > 0) {
      handlePlayFromQueue(queueIndex - 1);
    }
  }, [currentTime, queueIndex, handleSeek, handlePlayFromQueue]);

  const handleNextTrack = useCallback(() => {
    if (queueIndex < queue.length - 1) {
      handlePlayFromQueue(queueIndex + 1);
    }
  }, [queueIndex, queue.length, handlePlayFromQueue]);

  const handleLoadPlaylist = useCallback((playlistTracks) => {
    // Clear current queue and load playlist tracks
    setQueue(playlistTracks);
    setQueueIndex(-1);
    setCurrentTrack(null);
    setIsPlaying(false);
    setIsVideoPlaying(false);
    audioEngine.stop();
  }, []);

  // Drag and drop handlers
  const handleDragStart = (event) => {
    const { active } = event;
    
    if (active.data.current?.track) {
      setActiveDragItem(active.data.current.track);
    } else if (active.data.current?.album) {
      // Album drag
      const albumData = active.data.current.album;
      setActiveDragItem({ 
        title: albumData.album, 
        artist: albumData.artist,
        isAlbum: true,
        trackCount: albumData.tracks.length
      });
    } else if (active.data.current?.sortable) {
      const track = queue.find(t => t.id === active.id);
      setActiveDragItem(track);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveDragItem(null);
    
    if (!over) return;
    
    // Check if it's an album being dropped
    if (active.data.current?.album) {
      if (over.id === 'queue-drop-zone' || over.data.current?.sortable) {
        handleAddAlbumToQueue(active.data.current.album.tracks);
      }
      return;
    }
    
    // Check if it's a library item being dropped
    if (active.data.current?.track) {
      // Dropping on queue drop zone or any queue item
      if (over.id === 'queue-drop-zone' || over.data.current?.sortable) {
        handleAddToQueue(active.data.current.track);
      }
      return;
    }
    
    // Check if it's a queue reorder
    if (active.data.current?.sortable && over.data.current?.sortable) {
      const oldIndex = queue.findIndex(t => t.id === active.id);
      const newIndex = queue.findIndex(t => t.id === over.id);
      
      if (oldIndex !== newIndex && oldIndex !== -1 && newIndex !== -1) {
        const newQueue = [...queue];
        const [removed] = newQueue.splice(oldIndex, 1);
        newQueue.splice(newIndex, 0, removed);
        handleReorderQueue(newQueue);
      }
    }
  };

  if (!hasFolder) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Jim Media Player</h1>
          <p className="text-gray-600 mb-6">
            Select your music folder to get started. Your library is organized by artist and album folders.
          </p>
          
          {isLoading ? (
            <div className="text-gray-600">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p>Scanning... {scanProgress} tracks found</p>
            </div>
          ) : (
            <>
              <button
                onClick={selectFolder}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-lg transition shadow-md"
              >
                Select Music Folder
              </button>
              {useFallbackPicker && (
                <p className="text-xs text-gray-400 mt-3">
                  Mobile mode: Select your music folder from the file picker
                </p>
              )}
            </>
          )}
          
          {/* Hidden file input for mobile fallback */}
          <input
            ref={fileInputRef}
            type="file"
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleMobileFileSelect}
            className="hidden"
          />
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Jim Media Player</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{tracks.length} tracks</span>
            <button
              onClick={() => setShowPlaylists(true)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Playlists"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setShowEQ(true)}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Equalizer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
            <button
              onClick={selectFolder}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
              title="Change folder"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Library */}
          <div style={{ width: libraryWidth }} className="flex-shrink-0">
            <LibraryBrowser
              tracks={tracks}
              onPlayTrack={handlePlayTrack}
              onAddToQueue={handleAddToQueue}
              onAddAlbumToQueue={handleAddAlbumToQueue}
            />
          </div>
          
          {/* Resizer */}
          <div
            className={`w-1 cursor-col-resize hover:bg-blue-400 transition-colors flex-shrink-0 ${isResizing ? 'bg-blue-500' : 'bg-gray-300'}`}
            onMouseDown={handleResizeStart}
          />

          {/* Queue and Video */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Video Player - shows when playing video */}
            {isVideoPlaying && (
              <div className="p-4 bg-gray-900">
                <VideoPlayer 
                  isVisible={isVideoPlaying}
                  isPlaying={isPlaying}
                  onTogglePlay={handleTogglePlay}
                />
              </div>
            )}
            
            {/* Queue */}
            <div className={`${isVideoPlaying ? 'flex-1 min-h-0' : 'h-full'}`}>
              <NowPlayingQueue
                queue={queue}
                queueIndex={queueIndex}
                currentTime={currentTime}
                onReorder={handleReorderQueue}
                onRemove={handleRemoveFromQueue}
                onPlay={handlePlayFromQueue}
                onClear={handleClearQueue}
              />
            </div>
          </div>
        </div>

        {/* Player */}
        <PlayerControls
          isPlaying={isPlaying}
          currentTrack={currentTrack}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          onTogglePlay={handleTogglePlay}
          onNext={handleNextTrack}
          onPrevious={handlePrevious}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
        />

        {/* EQ Modal */}
        <Equalizer isVisible={showEQ} onClose={() => setShowEQ(false)} />
        
        {/* Playlists Modal */}
        <PlaylistPanel 
          isVisible={showPlaylists} 
          onClose={() => setShowPlaylists(false)}
          queue={queue}
          tracks={tracks}
          onLoadPlaylist={handleLoadPlaylist}
        />
        
        {/* Hidden file input for mobile fallback */}
        <input
          ref={fileInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleMobileFileSelect}
          className="hidden"
        />
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDragItem ? (
          <div className="bg-white border border-blue-400 rounded shadow-lg p-2 opacity-90">
            <div className="text-sm font-medium">
              {activeDragItem.isAlbum ? `📀 ${activeDragItem.title}` : activeDragItem.title}
            </div>
            <div className="text-xs text-gray-500">
              {activeDragItem.isAlbum 
                ? `${activeDragItem.artist} • ${activeDragItem.trackCount} tracks`
                : activeDragItem.artist
              }
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;
