
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
  private heightFilter: BiquadFilterNode | null = null;
  private bitCrusher: ScriptProcessorNode | null = null;

  async init(element: HTMLMediaElement, sampleRate: number = 96000, bitDepth: number = 32) {
    // Close existing context to allow sample rate change
    if (this.context) {
      if (this.context.state !== 'closed') {
        await this.context.close();
      }
      this.context = null;
    }

    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'playback',
      sampleRate: sampleRate
    });

    // Create Source
    this.source = this.context.createMediaElementSource(element);
    
    // Create Analyser
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;

    // Create Gain
    this.gainNode = this.context.createGain();

    // Create Compressor
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -24;
    this.compressor.knee.value = 30;
    this.compressor.ratio.value = 12;

    // Filters
    this.vocalFilter = this.context.createBiquadFilter();
    this.vocalFilter.type = 'peaking';
    this.vocalFilter.frequency.value = 3200;

    this.bassFilter = this.context.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 120;

    this.trebleFilter = this.context.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 6000;

    this.heightFilter = this.context.createBiquadFilter();
    this.heightFilter.type = 'peaking';
    this.heightFilter.frequency.value = 10000;

    this.theaterBoost = this.context.createBiquadFilter();
    this.theaterBoost.type = 'peaking';
    this.theaterBoost.frequency.value = 50;

    // Bit Depth Simulator (32-bit is passthrough)
    this.bitCrusher = this.context.createScriptProcessor(4096, 2, 2);
    this.bitCrusher.onaudioprocess = (e) => {
      const inputL = e.inputBuffer.getChannelData(0);
      const inputR = e.inputBuffer.getChannelData(1);
      const outputL = e.outputBuffer.getChannelData(0);
      const outputR = e.outputBuffer.getChannelData(1);
      
      if (bitDepth >= 32) {
        outputL.set(inputL);
        outputR.set(inputR);
        return;
      }

      const step = Math.pow(0.5, bitDepth - 1);
      for (let i = 0; i < inputL.length; i++) {
        outputL[i] = Math.round(inputL[i] / step) * step;
        outputR[i] = Math.round(inputR[i] / step) * step;
      }
    };

    // Spatializer
    this.panner = this.context.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';

    // Connection Chain
    this.source
      .connect(this.bassFilter)
      .connect(this.trebleFilter)
      .connect(this.heightFilter)
      .connect(this.theaterBoost)
      .connect(this.vocalFilter)
      .connect(this.bitCrusher)
      .connect(this.compressor)
      .connect(this.panner)
      .connect(this.gainNode)
      .connect(this.analyser)
      .connect(this.context.destination);
  }

  setVolume(value: number) {
    if (this.gainNode && this.context) this.gainNode.gain.setTargetAtTime(value, this.context.currentTime, 0.02);
  }

  setBass(value: number) {
    if (this.bassFilter && this.context) this.bassFilter.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
  }

  setTreble(value: number) {
    if (this.trebleFilter && this.context) this.trebleFilter.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
  }

  setVocalClarity(value: number) {
    if (this.vocalFilter && this.context) this.vocalFilter.gain.setTargetAtTime(value, this.context.currentTime, 0.05);
  }

  setDRC(value: number) {
    if (this.compressor && this.context) {
      const threshold = -10 - (value * 50);
      this.compressor.threshold.setTargetAtTime(threshold, this.context.currentTime, 0.05);
    }
  }

  setTheaterMode(enabled: boolean) {
    if (this.theaterBoost && this.context) {
      const boost = enabled ? 8 : 0;
      this.theaterBoost.gain.setTargetAtTime(boost, this.context.currentTime, 0.1);
    }
  }

  setHeightLevel(value: number) {
    if (this.heightFilter && this.context) {
      const gain = value * 10;
      this.heightFilter.gain.setTargetAtTime(gain, this.context.currentTime, 0.1);
    }
  }

  setSpatialPosition(x: number, y: number, z: number) {
    if (this.panner && this.context) {
      const time = this.context.currentTime;
      this.panner.positionX.setTargetAtTime(x * 5, time, 0.1);
      this.panner.positionY.setTargetAtTime(y * 5, time, 0.1);
      this.panner.positionZ.setTargetAtTime(z * 5, time, 0.1);
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
