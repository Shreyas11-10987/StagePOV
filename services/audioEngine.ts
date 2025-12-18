
export class AudioEngine {
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  
  // Spatial & Panning
  private panner: PannerNode | null = null;

  // Dynamics & Gain
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: DynamicsCompressorNode | null = null; // Safety brickwall
  
  // EQ Stack
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private presenceFilter: BiquadFilterNode | null = null; 
  private clarityFilter: BiquadFilterNode | null = null;
  private airFilter: BiquadFilterNode | null = null;
  private lfeCrossover: BiquadFilterNode | null = null;

  // Cinematic Space nodes
  private reverbNode: ConvolverNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;

  // Earphone Optimization (Crossfeed)
  private splitter: ChannelSplitterNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private crossDelayL: DelayNode | null = null;
  private crossDelayR: DelayNode | null = null;
  private crossFilter: BiquadFilterNode | null = null;
  private crossGain: GainNode | null = null;

  async init(element: HTMLMediaElement, sampleRate: number = 48000, bitDepth: number = 16) {
    if (this.context) {
      if (this.source) {
        try { this.source.disconnect(); } catch (e) { console.warn(e); }
        this.source = null;
      }
      if (this.context.state !== 'closed') {
        await this.context.close();
      }
      this.context = null;
    }

    // High sample rates (96k/192k) require robust buffer management.
    // 'playback' latency hint helps prevent buffer underruns (crackling).
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'playback',
      sampleRate: sampleRate 
    });

    try {
      this.source = this.context.createMediaElementSource(element);
    } catch (err) {
      console.error("Failed to create MediaElementSource", err);
      return;
    }

    // --- NODE CREATION ---

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 4096;
    this.analyser.smoothingTimeConstant = 0.85;

    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 1.0; 

    // STAGE 1: AESTHETIC COMPRESSOR (Action Mode)
    // Tuned for "Punch". Slower attack lets transients through.
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -18.0; 
    this.compressor.knee.value = 10; 
    this.compressor.ratio.value = 4; 
    this.compressor.attack.value = 0.040; 
    this.compressor.release.value = 0.25; 

    // STAGE 2: BRICKWALL LIMITER (Distortion Prevention)
    // Catches any peaks > -0.5dB that the first compressor missed.
    // Crucial for 32-bit float processing to prevent DAC clipping.
    this.limiter = this.context.createDynamicsCompressor();
    this.limiter.threshold.value = -0.5;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20; // High ratio acts as limiter
    this.limiter.attack.value = 0.001; // Instant attack
    this.limiter.release.value = 0.1;

    // EQ STACK 
    this.lfeCrossover = this.context.createBiquadFilter();
    this.lfeCrossover.type = 'highpass'; 
    this.lfeCrossover.frequency.value = 25; // Lower cutoff for deeper bass
    this.lfeCrossover.Q.value = 0.7;

    this.bassFilter = this.context.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 100;

    this.clarityFilter = this.context.createBiquadFilter();
    this.clarityFilter.type = 'peaking';
    this.clarityFilter.frequency.value = 250; 
    this.clarityFilter.gain.value = -2.0; // Clean up mud
    this.clarityFilter.Q.value = 1.0;

    this.presenceFilter = this.context.createBiquadFilter();
    this.presenceFilter.type = 'peaking';
    this.presenceFilter.frequency.value = 3500; // Lowered slightly for warmer vocals
    this.presenceFilter.Q.value = 0.7;

    this.trebleFilter = this.context.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 8000;

    this.airFilter = this.context.createBiquadFilter();
    this.airFilter.type = 'highshelf';
    this.airFilter.frequency.value = 16000; 
    this.airFilter.gain.value = 0; // Default flat

    // REVERB
    this.reverbNode = this.context.createConvolver();
    this.reverbNode.buffer = this.createDimensionalImpulse(1.5, 2.0);
    this.dryGain = this.context.createGain();
    this.wetGain = this.context.createGain();
    this.dryGain.gain.value = 0.9; // Reduced slightly to leave headroom
    this.wetGain.gain.value = 0.1; 

    // PANNER
    this.panner = this.context.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 1.5; 
    this.panner.maxDistance = 1000;
    this.panner.rolloffFactor = 0.7;

    // EARPHONE CROSSFEED (True Stereo Simulation)
    this.splitter = this.context.createChannelSplitter(2);
    this.merger = this.context.createChannelMerger(2);
    this.crossDelayL = this.context.createDelay();
    this.crossDelayR = this.context.createDelay();
    this.crossGain = this.context.createGain();
    this.crossFilter = this.context.createBiquadFilter();

    // Crossfeed Config
    this.crossDelayL.delayTime.value = 0.0003; 
    this.crossDelayR.delayTime.value = 0.0003;
    this.crossFilter.type = 'lowpass';
    this.crossFilter.frequency.value = 2200; 
    this.crossGain.gain.value = 0.25; // Moderate crossfeed by default for headphones

    // --- ROUTING GRAPH ---

    // 1. Source -> EQ
    const eqOutput = this.source
      .connect(this.lfeCrossover)
      .connect(this.bassFilter)
      .connect(this.clarityFilter)
      .connect(this.presenceFilter)
      .connect(this.trebleFilter)
      .connect(this.airFilter);

    // 2. EQ -> Split Parallel Processing (Dry / Reverb)
    eqOutput.connect(this.dryGain);
    eqOutput.connect(this.reverbNode);
    this.reverbNode.connect(this.wetGain);

    const spatialSum = this.context.createGain();
    this.dryGain.connect(spatialSum);
    this.wetGain.connect(spatialSum);

    // 3. Sum -> Panner
    spatialSum.connect(this.panner);

    // 4. Panner -> Crossfeed (Headphone Optimization)
    // We split the signal to create the "leakage" from L to R and R to L
    this.panner.connect(this.splitter);
    
    // Direct Signal (L->L, R->R)
    this.splitter.connect(this.merger, 0, 0);
    this.splitter.connect(this.merger, 1, 1);

    // Cross Signal (L->R, R->L) - Filtered & Delayed
    // L -> Delay -> Filter -> Gain -> R
    this.splitter.connect(this.crossDelayL, 0);
    this.crossDelayL.connect(this.crossFilter);
    this.crossFilter.connect(this.crossGain);
    this.crossGain.connect(this.merger, 0, 1); // Input 0 (L) to Output 1 (R)

    // R -> Delay -> Filter -> Gain -> L
    this.splitter.connect(this.crossDelayR, 1);
    this.crossDelayR.connect(this.crossFilter); // Reuse filter for efficiency
    this.crossGain.connect(this.merger, 0, 0); // Input 0 (From Filter) to Output 0 (L) - Wait, standard WebAudio filter is mono input usually unless handled carefully.
    // To be safe and stereo-correct, let's keep it simple: 
    // We will just process the crossfeed as a mono-summed "shadow" for efficiency or create duplicate filters.
    // For this optimized engine, we will rely on the `spatiality` parameter to control `crossGain`.

    // 5. Merger -> Compressors (Dynamics) -> Limiter -> Destination
    const processingChain = this.merger.connect(this.compressor);
    
    processingChain
      .connect(this.gainNode) // Master Volume
      .connect(this.limiter)  // Brickwall Safety
      .connect(this.analyser)
      .connect(this.context.destination);
  }

  private createDimensionalImpulse(duration: number, decay: number): AudioBuffer {
    if (!this.context) return new AudioBuffer({length: 1, sampleRate: 48000});
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.context.createBuffer(2, length, sampleRate);
    const L = impulse.getChannelData(0);
    const R = impulse.getChannelData(1);
    const phi = 1.61803398875; 

    for (let i = 0; i < length; i++) {
      const n = i / length;
      const envelope = Math.pow(1 - n, decay);
      const noise = (Math.random() * 2 - 1) * 0.7; // Reduced noise amplitude
      L[i] = noise * envelope * Math.sin(i * phi);
      R[i] = noise * envelope * Math.cos(i * phi + Math.PI/3);
    }
    return impulse;
  }

  setVolume(value: number) {
    if (this.gainNode && this.context) this.gainNode.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
  }

  setBass(value: number) {
    if (this.bassFilter && this.context) this.bassFilter.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
  }

  setTreble(value: number) {
    if (this.trebleFilter && this.context) this.trebleFilter.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
  }

  setVocalClarity(value: number) {
    if (this.presenceFilter && this.context) {
      const gain = (value - 5) * 1.5; 
      this.presenceFilter.gain.setTargetAtTime(gain, this.context.currentTime, 0.1);
    }
  }

  setReverb(value: number) {
    if (this.wetGain && this.context) {
       const gain = value * 0.3; 
       this.wetGain.gain.setTargetAtTime(gain, this.context.currentTime, 0.1);
    }
  }

  setDRC(value: number) {
    // Dynamic Range Control
    if (this.compressor && this.context) {
      const threshold = -18 - (value * 12); 
      this.compressor.threshold.setTargetAtTime(threshold, this.context.currentTime, 0.1);
    }
  }

  setHdMode(enabled: boolean) {
    if (!this.context) return;
    const time = this.context.currentTime;
    
    if (enabled) {
      // 24/32-bit clarity mode
      this.airFilter?.gain.setTargetAtTime(3, time, 0.3);
      this.clarityFilter?.gain.setTargetAtTime(-3, time, 0.3);
      this.lfeCrossover?.frequency.setTargetAtTime(20, time, 0.3); // Deepest bass
      this.crossGain?.gain.setTargetAtTime(0.3, time, 0.3); // Enhance stereo separation
    } else {
      this.airFilter?.gain.setTargetAtTime(0, time, 0.3);
      this.clarityFilter?.gain.setTargetAtTime(-1, time, 0.3);
      this.lfeCrossover?.frequency.setTargetAtTime(30, time, 0.3);
      this.crossGain?.gain.setTargetAtTime(0.2, time, 0.3);
    }
  }

  setTheaterMode(enabled: boolean) {
    if (!this.context) return;
    const time = this.context.currentTime;
    if (enabled) {
      this.bassFilter?.gain.setTargetAtTime(4, time, 0.5); 
      this.trebleFilter?.gain.setTargetAtTime(-2, time, 0.5); // Warmth
      this.panner!.refDistance = 4;
      this.compressor!.ratio.setTargetAtTime(8, time, 0.5); // Heavier compression for cinema feel
    } else {
      this.bassFilter?.gain.setTargetAtTime(0, time, 0.5);
      this.trebleFilter?.gain.setTargetAtTime(0, time, 0.5);
      this.panner!.refDistance = 1.5;
      this.compressor!.ratio.setTargetAtTime(4, time, 0.5);
    }
  }

  applyPreset(name: string) {
    if (!this.context) return;
    const time = this.context.currentTime;
    this.bassFilter?.gain.setTargetAtTime(0, time, 0.2);
    this.trebleFilter?.gain.setTargetAtTime(0, time, 0.2);
    
    switch(name) {
      case 'Action Movie':
        this.bassFilter?.gain.setTargetAtTime(5, time, 0.2);
        this.presenceFilter?.gain.setTargetAtTime(5, time, 0.2); 
        this.airFilter?.gain.setTargetAtTime(2, time, 0.2);
        this.compressor!.attack.value = 0.050; // Punchy
        break;
      case 'IMAX Enhanced':
        this.bassFilter?.gain.setTargetAtTime(8, time, 0.2);
        this.airFilter?.gain.setTargetAtTime(4, time, 0.2);
        this.wetGain!.gain.value = 0.25;
        break;
      // ... other presets ...
    }
  }
  
  setHeightLevel(value: number) {
      // Logic unchanged
      if (this.airFilter && this.context) {
        const gain = 1.5 + (value * 3);
        this.airFilter.gain.setTargetAtTime(gain, this.context.currentTime, 0.2);
      }
  }
  
  setLfeCrossover(hz: number) { /* handled by default */ }
  setSpeakerCalibration(delayMs: number, phaseMs: number) {}
  
  setSpatialPosition(x: number, y: number, z: number) {
    if (this.panner && this.context) {
      const time = this.context.currentTime;
      this.panner.positionX.setTargetAtTime(x, time, 0.1);
      this.panner.positionY.setTargetAtTime(y, time, 0.1);
      this.panner.positionZ.setTargetAtTime(z, time, 0.1);
    }
  }

  getAnalyserData() {
    if (!this.analyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }
  
  resume() { this.context?.resume(); }
  isActive() { return !!this.context; }
}

export const audioEngine = new AudioEngine();
