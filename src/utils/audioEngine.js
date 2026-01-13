class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.video = document.createElement('video');
    
    // Keep HTML5 elements at full volume - we control volume via Web Audio gain nodes
    this.audio.volume = 1;
    this.video.volume = 1;
    
    this.activeElement = this.audio; // Current media element (audio or video)
    this.audioContext = null;
    this.sourceNode = null;
    this.videoSourceNode = null;
    this.gainNode = null;
    this.fadeGainNode = null;
    this.filters = [];
    this.limiter = null;
    this.currentUrl = null;
    this.onEndedCallback = null;
    this.onTimeUpdateCallback = null;
    this.onCrossfadeCallback = null;
    this.isInitialized = false;
    this.isVideo = false;
    this.isCrossfading = false;
    this.crossfadeEnabled = false;
    this.crossfadeDuration = 3;
    this.volumeLevel = 1; // Store volume level (0-1)
    
    // Set up audio element events
    this.audio.addEventListener('ended', () => {
      if (!this.isVideo && this.onEndedCallback) {
        // Always call ended callback - crossfade just means we faded out first
        this.onEndedCallback();
      }
    });
    
    this.audio.addEventListener('timeupdate', () => {
      if (!this.isVideo) {
        if (this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback(this.audio.currentTime);
        }
        
        // Check for crossfade trigger
        if (this.crossfadeEnabled && !this.isCrossfading && this.audio.duration) {
          const timeRemaining = this.audio.duration - this.audio.currentTime;
          if (timeRemaining <= this.crossfadeDuration && timeRemaining > 0) {
            this.isCrossfading = true;
            this.startFadeOut(timeRemaining);
          }
        }
      }
    });
    
    // Set up video element events
    this.video.addEventListener('ended', () => {
      if (this.isVideo && this.onEndedCallback) {
        this.onEndedCallback();
      }
    });
    
    this.video.addEventListener('timeupdate', () => {
      if (this.isVideo && this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.video.currentTime);
      }
    });
  }

  setCrossfade(enabled, duration = 3) {
    this.crossfadeEnabled = enabled;
    this.crossfadeDuration = duration;
  }

  startFadeOut(duration) {
    if (!this.fadeGainNode || !this.audioContext) return;
    
    // Cancel any scheduled changes
    this.fadeGainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    
    // Set current value and ramp to zero
    this.fadeGainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
    this.fadeGainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + duration);
  }

  resetFade() {
    this.isCrossfading = false;
    this.crossfadeEnabled = false;
    if (this.fadeGainNode && this.audioContext) {
      this.fadeGainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
      this.fadeGainNode.gain.setValueAtTime(1, this.audioContext.currentTime);
    }
  }

  async initialize() {
    if (this.isInitialized) return;
    
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create source from audio element
    this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
    
    // Create EQ filters (5-band)
    const frequencies = [60, 250, 1000, 4000, 12000];
    this.filters = frequencies.map((freq, i) => {
      const filter = this.audioContext.createBiquadFilter();
      if (i === 0) {
        filter.type = 'lowshelf';
      } else if (i === frequencies.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1;
      }
      filter.frequency.value = freq;
      filter.gain.value = 0;
      return filter;
    });
    
    // Create limiter (compressor with high ratio)
    this.limiter = this.audioContext.createDynamicsCompressor();
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.25;
    
    // Create gain node for volume
    this.gainNode = this.audioContext.createGain();
    
    // Create separate gain node for crossfade
    this.fadeGainNode = this.audioContext.createGain();
    
    // Connect the audio chain: source -> filters -> limiter -> gain -> fadeGain -> destination
    let lastNode = this.sourceNode;
    for (const filter of this.filters) {
      lastNode.connect(filter);
      lastNode = filter;
    }
    lastNode.connect(this.limiter);
    this.limiter.connect(this.gainNode);
    this.gainNode.connect(this.fadeGainNode);
    this.fadeGainNode.connect(this.audioContext.destination);
    
    this.isInitialized = true;
  }

  async initializeVideo() {
    if (this.videoSourceNode) return;
    
    await this.initialize();
    
    // Create source from video element
    this.videoSourceNode = this.audioContext.createMediaElementSource(this.video);
    
    // Connect video to the same chain (starting at first filter)
    // The chain goes: filters -> limiter -> gainNode -> fadeGainNode -> destination
    this.videoSourceNode.connect(this.filters[0]);
  }

  async loadTrack(fileOrHandle, isVideo = false) {
    // Initialize audio context on first interaction (required by browsers)
    await this.initialize();
    
    if (isVideo) {
      await this.initializeVideo();
    }
    
    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Clean up previous URL
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
    }
    
    // Stop current playback
    this.audio.pause();
    this.video.pause();
    
    // Get file - handle both FileHandle (desktop) and File (mobile) objects
    let file;
    if (fileOrHandle instanceof File) {
      file = fileOrHandle;
    } else if (fileOrHandle.getFile) {
      file = await fileOrHandle.getFile();
    } else {
      throw new Error('Invalid file or handle');
    }
    
    this.currentUrl = URL.createObjectURL(file);
    this.isVideo = isVideo;
    this.activeElement = isVideo ? this.video : this.audio;
    
    return new Promise((resolve, reject) => {
      this.activeElement.src = this.currentUrl;
      
      this.activeElement.onloadedmetadata = () => {
        resolve();
      };
      
      this.activeElement.onerror = (e) => {
        reject(new Error('Failed to load media: ' + e.message));
      };
    });
  }

  getVideoElement() {
    return this.video;
  }

  getIsVideo() {
    return this.isVideo;
  }

  play() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.activeElement.play();
  }

  pause() {
    this.activeElement.pause();
  }

  stop() {
    this.activeElement.pause();
    this.activeElement.currentTime = 0;
  }

  seek(time) {
    this.activeElement.currentTime = time;
  }

  setVolume(value) {
    // value is 0-100
    this.volumeLevel = value / 100;
    
    // Use the gain node for volume control (not the HTML5 element)
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(this.volumeLevel, this.audioContext.currentTime);
    }
  }

  setEQ(band, value) {
    // value is -12 to +12 dB
    if (this.filters && this.filters[band]) {
      this.filters[band].gain.value = value;
    }
  }

  setNormalization(enabled) {
    if (this.limiter) {
      // When enabled, use compression. When disabled, set threshold very high
      this.limiter.threshold.value = enabled ? -6 : 0;
    }
  }

  getDuration() {
    return this.activeElement.duration || 0;
  }

  getCurrentTime() {
    return this.activeElement.currentTime || 0;
  }

  getState() {
    return this.activeElement.paused ? 'paused' : 'playing';
  }

  onEnded(callback) {
    this.onEndedCallback = callback;
  }

  onTimeUpdate(callback) {
    this.onTimeUpdateCallback = callback;
  }

  onCrossfade(callback) {
    this.onCrossfadeCallback = callback;
  }

  dispose() {
    this.audio.pause();
    this.video.pause();
    this.audio.src = '';
    this.video.src = '';
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export const audioEngine = new AudioEngine();
