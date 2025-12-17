
export class AudioEngine {
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private panner: PannerNode | null = null;
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private theaterBoost: BiquadFilterNode | null = null;
  private vocalFilter: BiquadFilterNode | null = null;
  private absorptionFilter: BiquadFilterNode | null = null;

  async init(element: HTMLMediaElement) {
    if (this.context) return;
    
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'playback',
      sampleRate: 48000
    });
    
    this.source = this.context.createMediaElementSource(element);
    
    this.gainNode = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;

    // Dynamic Range Compressor (DRC) for cinema impact
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;

    // Psychoacoustic Vocal Clarity (Center channel simulation)
    this.vocalFilter = this.context.createBiquadFilter();
    this.vocalFilter.type = 'peaking';
    this.vocalFilter.frequency.value = 3200; // Human vocal clarity band
    this.vocalFilter.Q.value = 1.2; 
    this.vocalFilter.gain.value = 0;

    this.bassFilter = this.context.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 120;

    this.trebleFilter = this.context.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 6000;

    // Virtual Theater reflections
    this.theaterBoost = this.context.createBiquadFilter();
    this.theaterBoost.type = 'peaking';
    this.theaterBoost.frequency.value = 50;
    this.theaterBoost.Q.value = 0.8;
    this.theaterBoost.gain.value = 0;

    this.absorptionFilter = this.context.createBiquadFilter();
    this.absorptionFilter.type = 'lowpass';
    this.absorptionFilter.frequency.value = 20000;

    // High-Resolution Panner
    this.panner = this.context.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 1;
    this.panner.maxDistance = 10000;
    this.panner.rolloffFactor = 1;

    // Signal Chain: Source -> EQ Stack -> Vocal -> Compressor -> Spatial -> Output
    this.source
      .connect(this.bassFilter)
      .connect(this.trebleFilter)
      .connect(this.theaterBoost)
      .connect(this.vocalFilter)
      .connect(this.compressor)
      .connect(this.panner)
      .connect(this.absorptionFilter)
      .connect(this.gainNode)
      .connect(this.analyser)
      .connect(this.context.destination);
  }

  setVolume(value: number) {
    if (this.gainNode) this.gainNode.gain.setTargetAtTime(value, this.context!.currentTime, 0.02);
  }

  setBass(value: number) {
    if (this.bassFilter) this.bassFilter.gain.setTargetAtTime(value, this.context!.currentTime, 0.05);
  }

  setTreble(value: number) {
    if (this.trebleFilter) this.trebleFilter.gain.setTargetAtTime(value, this.context!.currentTime, 0.05);
  }

  setVocalClarity(value: number) {
    if (this.vocalFilter) this.vocalFilter.gain.setTargetAtTime(value, this.context!.currentTime, 0.05);
  }

  setDRC(value: number) {
    if (this.compressor) {
      const threshold = -10 - (value * 50);
      this.compressor.threshold.setTargetAtTime(threshold, this.context!.currentTime, 0.05);
    }
  }

  setTheaterMode(enabled: boolean) {
    if (this.theaterBoost) {
      const boost = enabled ? 8 : 0;
      this.theaterBoost.gain.setTargetAtTime(boost, this.context!.currentTime, 0.1);
    }
  }

  setSpatialPosition(x: number, y: number, z: number) {
    if (this.panner && this.context) {
      const time = this.context.currentTime;
      const multiplier = 4;
      this.panner.positionX.setTargetAtTime(x * multiplier, time, 0.08);
      this.panner.positionY.setTargetAtTime(y * multiplier, time, 0.08);
      this.panner.positionZ.setTargetAtTime(z * multiplier, time, 0.08);
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
}

export const audioEngine = new AudioEngine();
