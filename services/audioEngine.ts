
export class AudioEngine {
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private panner: PannerNode | null = null;
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null; // Vocal presence
  private xCurveFilter: BiquadFilterNode | null = null; 
  private heightFilter: BiquadFilterNode | null = null;
  private lfeCrossover: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;

  // Cinematic Space nodes
  private reverbNode: ConvolverNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;

  async init(element: HTMLMediaElement, sampleRate: number = 48000, bitDepth: number = 16) {
    // Cleanup previous context and source
    if (this.context) {
      if (this.source) {
        try {
          this.source.disconnect();
        } catch (e) {
          console.warn("Error disconnecting old source:", e);
        }
        this.source = null;
      }

      if (this.context.state !== 'closed') {
        await this.context.close();
      }
      this.context = null;
    }

    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'playback',
      sampleRate: sampleRate
    });

    try {
      this.source = this.context.createMediaElementSource(element);
    } catch (err) {
      console.error("Failed to create MediaElementSource:", err);
      // If we fail here, it likely means the element is still tied to another context. 
      // The App.tsx key-remount fix should prevent this, but we catch it just in case.
      return;
    }

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;

    this.gainNode = this.context.createGain();
    // Default to a healthy boost
    this.gainNode.gain.value = 1.0; 

    this.compressor = this.context.createDynamicsCompressor();
    // LIMITER CONFIGURATION
    // Instead of compressing early, we use this as a safety ceiling (Brickwall Limiter).
    // This allows the volume to be pushed very high (via gainNode) without clipping.
    this.compressor.threshold.value = -0.5; // Only engage when hitting 99% volume
    this.compressor.knee.value = 0; // Hard knee for strict limiting
    this.compressor.ratio.value = 20; // Infinity:1 ratio (effectively)
    this.compressor.attack.value = 0.001; // Instant catch
    this.compressor.release.value = 0.1; // Fast release to preserve punch

    this.delayNode = this.context.createDelay(1.0);
    this.delayNode.delayTime.value = 0;

    // EQ STACK
    // Vocal Presence: Tuned to 3.2kHz which is the 'Intelligibility' sweet spot
    this.midFilter = this.context.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 3200; 
    this.midFilter.Q.value = 0.8;
    this.midFilter.gain.value = 0; // Default flat

    this.bassFilter = this.context.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 120; // Tightened low end

    // Treble: Tuned to 10kHz for "Air" and sparkle, removing the veil/muffle
    this.trebleFilter = this.context.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 10000;

    // Standard Cinema roll-off (Only active in theater mode)
    this.xCurveFilter = this.context.createBiquadFilter();
    this.xCurveFilter.type = 'highshelf';
    this.xCurveFilter.frequency.value = 8000;
    this.xCurveFilter.gain.value = 0;

    this.heightFilter = this.context.createBiquadFilter();
    this.heightFilter.type = 'peaking';
    this.heightFilter.frequency.value = 12000; // Higher for verticality perception

    this.lfeCrossover = this.context.createBiquadFilter();
    this.lfeCrossover.type = 'lowshelf';
    this.lfeCrossover.frequency.value = 80;
    this.lfeCrossover.gain.value = 0;

    // REVERB - Clearer Impulse Response
    this.reverbNode = this.context.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(1.2, 3.0); // Shorter, brighter reverb
    
    this.dryGain = this.context.createGain();
    this.wetGain = this.context.createGain();
    
    // Boost dry gain slightly to overcome filter insertion loss
    this.dryGain.gain.value = 1.2; 
    // Default Reverb to 0 (OFF) for clean music playback
    this.wetGain.gain.value = 0.0; 

    this.panner = this.context.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    // Centralized Sweet Spot Tuning
    this.panner.refDistance = 3; // Larger sweet spot before attenuation
    this.panner.maxDistance = 10000;
    this.panner.rolloffFactor = 0.5; // Gentler volume drop-off

    // UPDATED SIGNAL PATH: Maximizer Topology
    // Source -> EQ -> Split/Sum -> Panner -> Gain (Volume Drive) -> Compressor (Limiter) -> Out
    
    this.source
      .connect(this.midFilter)
      .connect(this.bassFilter)
      .connect(this.trebleFilter)
      .connect(this.xCurveFilter)
      .connect(this.heightFilter)
      .connect(this.lfeCrossover);

    // Split point
    this.lfeCrossover.connect(this.dryGain);
    this.lfeCrossover.connect(this.reverbNode);
    this.reverbNode.connect(this.wetGain);

    // Sum point
    this.dryGain.connect(this.delayNode);
    this.wetGain.connect(this.delayNode);

    // Master bus
    // Note: gainNode is now BEFORE compressor to allow driving into the limiter
    this.delayNode
      .connect(this.panner)
      .connect(this.gainNode) 
      .connect(this.compressor)
      .connect(this.analyser)
      .connect(this.context.destination);
  }

  private createImpulseResponse(duration: number, decay: number): AudioBuffer {
    if (!this.context) return new AudioBuffer({length: 1, sampleRate: 48000});
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * duration;
    const impulse = this.context.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        // High-pass filter the noise slightly to avoid muddy reverb tails
        const noise = (Math.random() * 2 - 1);
        channelData[i] = noise * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }

  setVolume(value: number) {
    // Direct gain control. Since it hits the limiter next, higher values = louder perceived volume
    if (this.gainNode && this.context) this.gainNode.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
  }

  setBass(value: number) {
    if (this.bassFilter && this.context) this.bassFilter.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
  }

  setTreble(value: number) {
    if (this.trebleFilter && this.context) this.trebleFilter.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
  }

  setVocalClarity(value: number) {
    // value 0-10, map to gain -2 to +8dB
    if (this.midFilter && this.context) {
      const gain = (value - 5) * 2; 
      this.midFilter.gain.setTargetAtTime(gain, this.context.currentTime, 0.1);
    }
  }

  setReverb(value: number) {
    if (this.wetGain && this.context) {
       this.wetGain.gain.setTargetAtTime(value, this.context.currentTime, 0.1);
    }
  }

  setDRC(value: number) {
    // In this new topology, DRC controls the Limiter Threshold. 
    // Higher DRC = Lower Threshold = More "Squashed" / Safer
    if (this.compressor && this.context) {
      const threshold = -0.5 - (value * 12); 
      this.compressor.threshold.setTargetAtTime(threshold, this.context.currentTime, 0.1);
    }
  }

  setTheaterMode(enabled: boolean) {
    if (!this.context) return;
    const time = this.context.currentTime;
    
    if (enabled) {
      this.xCurveFilter?.gain.setTargetAtTime(-1.5, time, 0.5); 
      // Removed automatic wetGain manipulation to allow manual control
      this.bassFilter?.gain.setTargetAtTime(4, time, 0.5); 
      this.midFilter?.gain.setTargetAtTime(3, time, 0.5); 
    } else {
      this.xCurveFilter?.gain.setTargetAtTime(0, time, 0.5);
      // Removed automatic wetGain manipulation
      this.bassFilter?.gain.setTargetAtTime(0, time, 0.5);
      this.midFilter?.gain.setTargetAtTime(0, time, 0.5);
    }
  }

  applyPreset(name: string) {
    if (!this.context) return;
    const time = this.context.currentTime;
    
    // Removed wetGain reset here
    this.bassFilter?.gain.setTargetAtTime(0, time, 0.2);
    this.trebleFilter?.gain.setTargetAtTime(0, time, 0.2);
    this.midFilter?.gain.setTargetAtTime(0, time, 0.2);

    switch(name) {
      case 'IMAX Enhanced':
        this.bassFilter?.gain.setTargetAtTime(8, time, 0.2);
        this.midFilter?.gain.setTargetAtTime(3, time, 0.2);
        this.trebleFilter?.gain.setTargetAtTime(2, time, 0.2);
        // Reverb changes removed
        this.reverbNode!.buffer = this.createImpulseResponse(2.5, 1.5);
        break;
      case 'THX Reference':
        this.midFilter?.gain.setTargetAtTime(1, time, 0.2);
        break;
      case 'Concert Auditorium':
        this.trebleFilter?.gain.setTargetAtTime(1, time, 0.2);
        this.reverbNode!.buffer = this.createImpulseResponse(3.5, 2.0);
        break;
      case 'Vintage Cinema':
        this.midFilter?.gain.setTargetAtTime(5, time, 0.2);
        this.xCurveFilter?.gain.setTargetAtTime(-4, time, 0.2);
        break;
      case 'Pure Direct':
        // Flat response
        break;
    }
  }

  setHeightLevel(value: number) {
    if (this.heightFilter && this.context) {
      const gain = value * 6;
      this.heightFilter.gain.setTargetAtTime(gain, this.context.currentTime, 0.2);
    }
  }

  setLfeCrossover(hz: number) {
    if (this.lfeCrossover && this.context) {
      this.lfeCrossover.frequency.setTargetAtTime(hz, this.context.currentTime, 0.1);
    }
  }

  setSpeakerCalibration(delayMs: number, phaseMs: number) {
    if (this.delayNode && this.context) {
      const totalDelaySeconds = (delayMs + phaseMs) / 1000;
      this.delayNode.delayTime.setTargetAtTime(totalDelaySeconds, this.context.currentTime, 0.1);
    }
  }

  setSpatialPosition(x: number, y: number, z: number) {
    if (this.panner && this.context) {
      const time = this.context.currentTime;
      this.panner.positionX.setTargetAtTime(x * 5, time, 0.2);
      this.panner.positionY.setTargetAtTime(y * 5, time, 0.2);
      this.panner.positionZ.setTargetAtTime(z * 5, time, 0.2);
    }
  }

  getAnalyserData() {
    if (!this.analyser) return new Uint8Array(0);
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  resume() {
    this.context?.resume();
  }

  isActive() {
    return !!this.context;
  }
}

export const audioEngine = new AudioEngine();
