import React from 'react';

export function PlayerControls({ 
  isPlaying, 
  currentTrack, 
  currentTime, 
  duration, 
  volume,
  onTogglePlay, 
  onNext, 
  onPrevious, 
  onSeek, 
  onVolumeChange 
}) {
  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    onSeek(percent * duration);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {/* Track Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1 min-w-0">
          {currentTrack ? (
            <>
              <div className="font-medium text-gray-800 truncate">{currentTrack.title}</div>
              <div className="text-sm text-gray-500 truncate">{currentTrack.artist} — {currentTrack.album}</div>
            </>
          ) : (
            <div className="text-gray-400">No track selected</div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div
          className="h-2 bg-gray-200 rounded-full cursor-pointer relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full shadow"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPrevious}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-800"
          disabled={!currentTrack}
        >
          <PreviousIcon />
        </button>
        
        <button
          onClick={onTogglePlay}
          className="p-3 bg-blue-500 hover:bg-blue-600 rounded-full text-white shadow-lg"
          disabled={!currentTrack}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        
        <button
          onClick={onNext}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-600 hover:text-gray-800"
          disabled={!currentTrack}
        >
          <NextIcon />
        </button>

        {/* Volume */}
        <div className="flex items-center gap-2 ml-4">
          <VolumeIcon />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="w-24 accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

function PreviousIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16 18h2V6h-2v12zM6 18l8.5-6L6 6v12z" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}
