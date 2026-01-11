import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../utils/audioEngine';

export function VideoPlayer({ isVisible, isPlaying, onTogglePlay }) {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (isVisible && containerRef.current) {
      const videoElement = audioEngine.getVideoElement();
      if (videoElement && containerRef.current) {
        // Only append if not already a child
        if (videoElement.parentNode !== containerRef.current) {
          containerRef.current.appendChild(videoElement);
        }
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'contain';
        videoElement.style.backgroundColor = '#000';
      }
    }
    
    return () => {
      const videoElement = audioEngine.getVideoElement();
      if (videoElement && videoElement.parentNode) {
        // Don't remove - just leave it where it is
      }
    };
  }, [isVisible]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  const handleVideoClick = () => {
    onTogglePlay();
  };

  if (!isVisible) return null;

  return (
    <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
      <div 
        ref={containerRef}
        onClick={handleVideoClick}
        className="aspect-video cursor-pointer relative"
      >
        {/* Play/Pause overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <div className="w-16 h-16 rounded-full bg-white bg-opacity-80 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {/* Fullscreen button */}
      <button
        onClick={toggleFullscreen}
        className="absolute bottom-2 right-2 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded text-white transition"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m11 5l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m11-5l5 5m0 0v-4m0 4h-4" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5" />
          </svg>
        )}
      </button>
    </div>
  );
}
