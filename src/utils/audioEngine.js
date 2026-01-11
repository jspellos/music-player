class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.audioContext = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.filters = [];
    this.limiter = null;
    this.currentUrl = null;
    this.onEndedCallback = null;
    this.onTimeUpdateCallback = null;
    this.isInitialized = false;
    
    // Set up audio element events
    this.audio.addEventListener('ended', () => {
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    });
    
    this.audio.addEventListener('timeupdate', () => {
      if (this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback(this.audio.currentTime);
      }
    });
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
    
    // Connect the chain: source -> filters -> limiter -> gain -> destination
    let lastNode = this.sourceNode;
    for (const filter of this.filters) {
      lastNode.connect(filter);
      lastNode = filter;
    }
    lastNode.connect(this.limiter);
    this.limiter.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
    
    this.isInitialized = true;
  }

  async loadTrack(fileHandle) {
    // Initialize audio context on first interaction (required by browsers)
    await this.initialize();
    
    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Clean up previous URL
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
    }
    
    // Get file and create URL
    const file = await fileHandle.getFile();
    this.currentUrl = URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      this.audio.src = this.currentUrl;
      
      this.audio.onloadedmetadata = () => {
        resolve();
      };
      
      this.audio.onerror = (e) => {
        reject(new Error('Failed to load audio: ' + e.message));
      };
    });
  }

  play() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  seek(time) {
    this.audio.currentTime = time;
  }

  setVolume(value) {
    // value is 0-100
    this.audio.volume = value / 100;
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
    return this.audio.duration || 0;
  }

  getCurrentTime() {
    return this.audio.currentTime || 0;
  }

  getState() {
    return this.audio.paused ? 'paused' : 'playing';
  }

  onEnded(callback) {
    this.onEndedCallback = callback;
  }

  onTimeUpdate(callback) {
    this.onTimeUpdateCallback = callback;
  }

  dispose() {
    this.audio.pause();
    this.audio.src = '';
    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

export const audioEngine = new AudioEngine();
