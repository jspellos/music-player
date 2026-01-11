import { useState, useEffect, useCallback, useRef } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { getQueue, addToQueue, removeFromQueue, reorderQueue, clearQueue } from '../stores/db';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const fileHandlesRef = useRef(new Map());

  // Load queue from DB on mount
  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    const savedQueue = await getQueue();
    setQueue(savedQueue);
  };

  // Set up audio engine callbacks
  useEffect(() => {
    audioEngine.onTimeUpdate((time) => {
      setCurrentTime(time);
    });

    audioEngine.onEnded(() => {
      playNext();
    });

    return () => {
      audioEngine.dispose();
    };
  }, []);

  const storeFileHandle = useCallback((trackId, fileHandle) => {
    fileHandlesRef.current.set(trackId, fileHandle);
  }, []);

  const getFileHandle = useCallback((trackId) => {
    return fileHandlesRef.current.get(trackId);
  }, []);

  const playTrack = useCallback(async (track, fileHandle) => {
    try {
      if (fileHandle) {
        storeFileHandle(track.id, fileHandle);
      }
      
      const handle = fileHandle || getFileHandle(track.id);
      if (!handle) {
        console.error('No file handle for track');
        return;
      }

      await audioEngine.loadTrack(handle);
      audioEngine.play();
      
      setCurrentTrack(track);
      setIsPlaying(true);
      setDuration(audioEngine.getDuration());
      setCurrentTime(0);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  }, [storeFileHandle, getFileHandle]);

  const addTrackToQueue = useCallback(async (track, fileHandle) => {
    if (fileHandle) {
      storeFileHandle(track.id, fileHandle);
    }
    await addToQueue(track.id);
    await loadQueue();
  }, [storeFileHandle]);

  const removeTrackFromQueue = useCallback(async (queueItemId) => {
    await removeFromQueue(queueItemId);
    await loadQueue();
  }, []);

  const reorderQueueItems = useCallback(async (newOrder) => {
    await reorderQueue(newOrder);
    await loadQueue();
  }, []);

  const clearQueueItems = useCallback(async () => {
    await clearQueue();
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  const play = useCallback(() => {
    audioEngine.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    audioEngine.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback((time) => {
    audioEngine.seek(time);
    setCurrentTime(time);
  }, []);

  const setVolume = useCallback((value) => {
    setVolumeState(value);
    audioEngine.setVolume(value);
  }, []);

  const playNext = useCallback(async () => {
    if (queue.length === 0) return;
    
    const nextIndex = queueIndex + 1;
    if (nextIndex < queue.length) {
      const nextItem = queue[nextIndex];
      const fileHandle = getFileHandle(nextItem.trackId);
      if (nextItem.track && fileHandle) {
        setQueueIndex(nextIndex);
        await playTrack(nextItem.track, fileHandle);
      }
    } else {
      // End of queue
      setIsPlaying(false);
      setQueueIndex(-1);
    }
  }, [queue, queueIndex, playTrack, getFileHandle]);

  const playPrevious = useCallback(async () => {
    if (queue.length === 0) return;
    
    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      seek(0);
      return;
    }
    
    const prevIndex = queueIndex - 1;
    if (prevIndex >= 0) {
      const prevItem = queue[prevIndex];
      const fileHandle = getFileHandle(prevItem.trackId);
      if (prevItem.track && fileHandle) {
        setQueueIndex(prevIndex);
        await playTrack(prevItem.track, fileHandle);
      }
    }
  }, [queue, queueIndex, currentTime, seek, playTrack, getFileHandle]);

  const playFromQueue = useCallback(async (index) => {
    if (index >= 0 && index < queue.length) {
      const item = queue[index];
      const fileHandle = getFileHandle(item.trackId);
      if (item.track && fileHandle) {
        setQueueIndex(index);
        await playTrack(item.track, fileHandle);
      }
    }
  }, [queue, playTrack, getFileHandle]);

  return {
    isPlaying,
    currentTrack,
    currentTime,
    duration,
    volume,
    queue,
    queueIndex,
    playTrack,
    addTrackToQueue,
    removeTrackFromQueue,
    reorderQueueItems,
    clearQueueItems,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    playNext,
    playPrevious,
    playFromQueue,
    storeFileHandle,
    loadQueue
  };
}
