import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlbumArt } from './AlbumArt';

export function NowPlayingQueue({ queue, queueIndex, currentTime, onReorder, onRemove, onPlay, onClear, onToggleCrossfade, getFileHandle }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'queue-drop-zone'
  });

  // Calculate total and remaining duration
  const { totalDuration, remainingDuration } = useMemo(() => {
    let total = 0;
    let remaining = 0;
    
    queue.forEach((track, index) => {
      const trackDuration = track.duration || 0;
      total += trackDuration;
      
      if (index > queueIndex) {
        remaining += trackDuration;
      } else if (index === queueIndex) {
        // Add remaining time of current track
        remaining += Math.max(0, trackDuration - (currentTime || 0));
      }
    });
    
    return { totalDuration: total, remainingDuration: remaining };
  }, [queue, queueIndex, currentTime]);

  const formatDuration = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={setNodeRef}
      className={`h-full flex flex-col border-l border-white/10 transition-colors ${
        isOver ? 'bg-teal-500/10' : 'glass-panel'
      }`}
    >
      <div className="p-3 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="font-semibold gradient-text-teal">
            Now Playing
            {queue.length > 0 && <span className="text-gray-500 font-normal ml-2">({queue.length})</span>}
          </h2>
          {queue.length > 0 && remainingDuration > 0 && (
            <div className="text-xs text-gray-500">
              {formatDuration(remainingDuration)} remaining
              {totalDuration !== remainingDuration && ` • ${formatDuration(totalDuration)} total`}
            </div>
          )}
        </div>
        {queue.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-gray-500 hover:text-red-400"
          >
            Clear
          </button>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {queue.length === 0 ? (
          <div className={`h-full flex flex-col items-center justify-center text-gray-500 text-sm border-2 border-dashed rounded-lg transition-colors ${
            isOver ? 'border-teal-400 bg-teal-500/10 text-teal-400' : 'border-white/20'
          }`}>
            <DropIcon className="w-12 h-12 mb-3" />
            <p className="font-medium">Drop tracks here</p>
            <p className="text-xs mt-1">or click + in the library</p>
          </div>
        ) : (
          <div className={`min-h-full rounded-lg transition-colors ${isOver ? 'bg-teal-500/10 ring-2 ring-teal-400' : ''}`}>
            <SortableContext
              items={queue.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {queue.map((track, index) => (
                <SortableQueueItem
                  key={track.id}
                  track={track}
                  index={index}
                  isPlaying={index === queueIndex}
                  onPlay={() => onPlay(index)}
                  onRemove={() => onRemove(track.id)}
                  onToggleCrossfade={() => onToggleCrossfade(track.id)}
                  getFileHandle={getFileHandle}
                />
              ))}
            </SortableContext>
            {isOver && (
              <div className="p-2 text-center text-teal-400 text-sm border-2 border-dashed border-teal-400 rounded-lg mt-1">
                Drop to add to queue
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SortableQueueItem({ track, index, isPlaying, onPlay, onRemove, onToggleCrossfade, getFileHandle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const fileHandle = getFileHandle(track.id);
  const albumKey = `${track.artist}/${track.album}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg mb-1 group ${
        isDragging ? 'opacity-50 z-50' : ''
      } ${
        isPlaying ? 'glow-border bg-teal-500/20' : 'bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10'
      }`}
    >
      <button
        className="text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
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
        onClick={onPlay}
        className="flex-1 text-left truncate min-w-0"
      >
        <div className={`text-sm truncate flex items-center gap-1 ${isPlaying ? 'text-teal-400 font-medium' : 'text-gray-200'}`}>
          {track.isVideo && <VideoIcon />}
          <span className="truncate">{track.title}</span>
          {track.crossfade && <CrossfadeIcon className="text-orange-400" />}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {track.artist} — {track.album}
        </div>
      </button>
      
      {!track.isVideo && (
        <button
          onClick={onToggleCrossfade}
          className={`p-1 rounded transition-opacity flex-shrink-0 ${
            track.crossfade 
              ? 'text-orange-400 hover:bg-orange-500/20' 
              : 'opacity-0 group-hover:opacity-100 text-gray-500 hover:bg-white/10 hover:text-orange-400'
          }`}
          title={track.crossfade ? 'Crossfade on - click to disable' : 'Enable crossfade for this track'}
        >
          <CrossfadeIcon />
        </button>
      )}
      
      <button
        onClick={onRemove}
        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded text-red-400 transition-opacity flex-shrink-0"
        title="Remove from queue"
      >
        <XIcon />
      </button>
    </div>
  );
}

function GripIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm8-12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm0 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function DropIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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

function CrossfadeIcon({ className = '' }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  );
}
