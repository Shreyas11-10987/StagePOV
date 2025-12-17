
export class AudioEngine {
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private panner: PannerNode | null = null;
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private theaterBoost: BiquadFilterNode | null = null;
  private vocalFilter: BiquadFilterNode | null = null;
  private absorptionFilter: BiquadFilterNode | null = null;

  async init(element: HTMLMediaElement) {
    if (this.context) return;
    
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.source = this.context.createMediaElementSource(element);
    
    this.gainNode = this.context.createGain();
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 512;

    this.vocalFilter = this.context.createBiquadFilter();
    this.vocalFilter.type = 'peaking';
    this.vocalFilter.frequency.value = 3200;
    this.vocalFilter.Q.value = 1.2;
    this.vocalFilter.gain.value = 0;

    this.bassFilter = this.context.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 180;

    this.trebleFilter = this.context.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 4500;

    this.theaterBoost = this.context.createBiquadFilter();
    this.theaterBoost.type = 'peaking';
    this.theaterBoost.frequency.value = 55;
    this.theaterBoost.Q.value = 0.8;
    this.theaterBoost.gain.value = 0;

    this.absorptionFilter = this.context.createBiquadFilter();
    this.absorptionFilter.type = 'lowpass';
    this.absorptionFilter.frequency.value = 20000;

    this.panner = this.context.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 1;
    this.panner.maxDistance = 10000;
    this.panner.rolloffFactor = 1.5;

    // Direct Signal Chain: Source -> EQs -> Panner -> Absorption -> Gain -> Analyser -> Out
    this.source
      .connect(this.vocalFilter)
      .connect(this.bassFilter)
      .connect(this.trebleFilter)
      .connect(this.theaterBoost)
      .connect(this.panner)
      .connect(this.absorptionFilter)
      .connect(this.gainNode)
      .connect(this.analyser)
      .connect(this.context.destination);
  }

  setVolume(value: number) {
    if (this.gainNode) this.gainNode.gain.setTargetAtTime(value, this.context!.currentTime, 0.1);
  }

  setBass(value: number) {
    if (this.bassFilter) this.bassFilter.gain.setTargetAtTime(value, this.context!.currentTime, 0.1);
  }

  setTreble(value: number) {
    if (this.trebleFilter) this.trebleFilter.gain.setTargetAtTime(value, this.context!.currentTime, 0.1);
  }

  setVocalClarity(value: number) {
    if (this.vocalFilter) this.vocalFilter.gain.setTargetAtTime(value, this.context!.currentTime, 0.1);
  }

  setTheaterMode(enabled: boolean) {
    if (this.theaterBoost) {
      const bassGain = enabled ? 12 : 0;
      this.theaterBoost.gain.setTargetAtTime(bassGain, this.context!.currentTime, 0.2);
    }
  }

  setSpatialPosition(x: number, y: number, z: number) {
    if (this.panner && this.absorptionFilter) {
      const time = this.context!.currentTime;
      const scale = 5;
      const px = x * scale;
      const py = y * scale;
      const pz = z * scale;

      this.panner.positionX.setTargetAtTime(px, time, 0.1);
      this.panner.positionY.setTargetAtTime(py, time, 0.1);
      this.panner.positionZ.setTargetAtTime(pz, time, 0.1);

      const distance = Math.sqrt(px*px + py*py + pz*pz);
      const airAbsorptionFreq = Math.max(2000, 20000 * Math.exp(-distance * 0.12));
      this.absorptionFilter.frequency.setTargetAtTime(airAbsorptionFreq, time, 0.15);
    }
  }

  setListenerOrientation(forwardX: number, forwardY: number, forwardZ: number) {
    if (this.context && this.context.listener) {
      const listener = this.context.listener;
      const time = this.context.currentTime;
      if (listener.forwardX) {
        listener.forwardX.setTargetAtTime(forwardX, time, 0.1);
        listener.forwardY.setTargetAtTime(forwardY, time, 0.1);
        listener.forwardZ.setTargetAtTime(forwardZ, time, 0.1);
      }
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
