
import { AudioSettings } from '../types';

export class AudioEngine {
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private panner: PannerNode | null = null;
  private gainNode: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null; 
  private xCurveFilter: BiquadFilterNode | null = null; 
  private heightFilter: BiquadFilterNode | null = null;
  private lfeCrossover: BiquadFilterNode | null = null;
  private delayNode: DelayNode | null = null;

  // HD Audio Nodes
  private hdLowFilter: BiquadFilterNode | null = null;
  private hdHighFilter: BiquadFilterNode | null = null;
  private hdMidDip: BiquadFilterNode | null = null;

  // Cinematic Space nodes
  private reverbNode: ConvolverNode | null = null;
  private dryGain: GainNode | null = null;
  private wetGain: GainNode | null = null;

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

    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'playback',
      sampleRate: sampleRate
    });

    try {
      this.source = this.context.createMediaElementSource(element);
    } catch (err) {
      console.error("Failed to create MediaElementSource:", err);
      return;
    }

    this.setupGraph(this.context, this.source, this.context.destination);
  }

  // Abstracted graph setup to support both Realtime and Offline contexts
  private setupGraph(ctx: BaseAudioContext, source: AudioNode, destination: AudioNode) {
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 1.0; 

    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -0.5;
    this.compressor.knee.value = 0;
    this.compressor.ratio.value = 20;
    this.compressor.attack.value = 0.001;
    this.compressor.release.value = 0.1;

    this.delayNode = ctx.createDelay(1.0);
    this.delayNode.delayTime.value = 0;

    // EQ STACK
    this.midFilter = ctx.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 3200; 
    this.midFilter.Q.value = 0.8;
    this.midFilter.gain.value = 0; 

    this.bassFilter = ctx.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 120; 

    this.trebleFilter = ctx.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 10000;

    this.xCurveFilter = ctx.createBiquadFilter();
    this.xCurveFilter.type = 'highshelf';
    this.xCurveFilter.frequency.value = 8000;
    this.xCurveFilter.gain.value = 0;

    this.heightFilter = ctx.createBiquadFilter();
    this.heightFilter.type = 'peaking';
    this.heightFilter.frequency.value = 12000; 

    this.lfeCrossover = ctx.createBiquadFilter();
    this.lfeCrossover.type = 'lowshelf';
    this.lfeCrossover.frequency.value = 80;
    this.lfeCrossover.gain.value = 0;

    this.hdLowFilter = ctx.createBiquadFilter();
    this.hdLowFilter.type = 'lowshelf';
    this.hdLowFilter.frequency.value = 60;
    this.hdLowFilter.gain.value = 0;

    this.hdMidDip = ctx.createBiquadFilter();
    this.hdMidDip.type = 'peaking';
    this.hdMidDip.frequency.value = 500;
    this.hdMidDip.gain.value = 0;
    this.hdMidDip.Q.value = 1.0;

    this.hdHighFilter = ctx.createBiquadFilter();
    this.hdHighFilter.type = 'highshelf';
    this.hdHighFilter.frequency.value = 12000; 
    this.hdHighFilter.gain.value = 0;

    this.reverbNode = ctx.createConvolver();
    // Default IR
    this.reverbNode.buffer = this.createImpulseResponse(ctx, 1.2, 3.0);
    
    this.dryGain = ctx.createGain();
    this.wetGain = ctx.createGain();
    this.dryGain.gain.value = 1.2; 
    this.wetGain.gain.value = 0.0; 

    this.panner = ctx.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = 3;
    this.panner.maxDistance = 10000;
    this.panner.rolloffFactor = 0.5;

    // Connect Nodes
    source
      .connect(this.midFilter)
      .connect(this.bassFilter)
      .connect(this.trebleFilter)
      .connect(this.xCurveFilter)
      .connect(this.heightFilter)
      .connect(this.lfeCrossover)
      .connect(this.hdLowFilter)
      .connect(this.hdMidDip)
      .connect(this.hdHighFilter);

    this.hdHighFilter.connect(this.dryGain);
    this.hdHighFilter.connect(this.reverbNode);
    this.reverbNode.connect(this.wetGain);

    this.dryGain.connect(this.delayNode);
    this.wetGain.connect(this.delayNode);

    this.delayNode
      .connect(this.panner)
      .connect(this.gainNode) 
      .connect(this.compressor);

    // Only connect analyser if realtime context
    if (ctx instanceof AudioContext) {
      this.compressor.connect(this.analyser!).connect(destination);
    } else {
      this.compressor.connect(destination);
    }
  }

  // --- OFFLINE RENDERING LOGIC ---

  async renderOffline(
    fileBlob: Blob, 
    settings: AudioSettings, 
    onProgress: (p: number) => void
  ): Promise<Blob> {
    const arrayBuffer = await fileBlob.arrayBuffer();
    
    // We need a temporary context just to decode the audio data
    const tempCtx = new AudioContext();
    const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer);
    tempCtx.close();

    const offlineCtx = new OfflineAudioContext(
      2, 
      audioBuffer.length, 
      settings.sampleRate
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    // Set up the exact processing chain on the offline context
    this.setupGraph(offlineCtx, source, offlineCtx.destination);
    
    // Apply Settings to Offline Nodes
    // Note: We access the nodes we just created in setupGraph. 
    // Since setupGraph overwrites the class properties, we are manipulating the offline nodes now.
    // This is safe because renderOffline shouldn't be called during active playback initialization.
    
    // Apply EQ
    this.bassFilter!.gain.value = settings.bass;
    this.trebleFilter!.gain.value = settings.treble;
    this.midFilter!.gain.value = (settings.vocalClarity - 5) * 2;
    this.heightFilter!.gain.value = settings.heightLevel * 6;
    
    // Apply Modes
    if (settings.isTheaterMode) {
       this.xCurveFilter!.gain.value = -1.5;
       this.bassFilter!.gain.value = (settings.bass || 0) + 4;
       this.midFilter!.gain.value = ((settings.vocalClarity - 5) * 2) + 3;
    }
    
    if (settings.isHdAudioEnabled) {
       this.hdLowFilter!.gain.value = 4;
       this.hdMidDip!.gain.value = -3;
       this.hdHighFilter!.gain.value = 6;
    }

    // Apply Reverb
    this.wetGain!.gain.value = settings.reverbLevel;
    
    // Apply Preset specific IR modifications if needed
    if (settings.selectedPreset === 'IMAX Enhanced') {
       this.reverbNode!.buffer = this.createImpulseResponse(offlineCtx, 2.5, 1.5);
    }

    // Apply Volume
    this.gainNode!.gain.value = settings.volume;

    // Apply DRC
    this.compressor!.threshold.value = -0.5 - (settings.drc * 12);

    source.start(0);

    // Render
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Re-init live engine to restore state for playback
    // (User will need to press play again, which re-inits automatically in App.tsx)
    
    // Convert to WAV
    return this.audioBufferToWav(renderedBuffer, settings.bitDepth);
  }

  private audioBufferToWav(buffer: AudioBuffer, bitDepth: number): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * (bitDepth / 8);
    const bufferLength = 44 + length;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    const channels = [];
    let sample = 0;
    let offset = 0;
    let pos = 0;

    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(bufferLength - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * numOfChan * (bitDepth / 8)); // avg. bytes/sec
    setUint16(numOfChan * (bitDepth / 8)); // block-align
    setUint16(bitDepth); // 16-bit or 32-bit (handled below)

    setUint32(0x61746164); // "data" - chunk
    setUint32(length); // chunk length

    // write interleaved data
    for(let i = 0; i < buffer.numberOfChannels; i++)
      channels.push(buffer.getChannelData(i));

    pos = 44;
    
    // Helper
    function setUint16(data: number) {
      view.setUint16(pos, data, true);
      pos += 2;
    }
    function setUint32(data: number) {
      view.setUint32(pos, data, true);
      pos += 4;
    }

    while(pos < bufferLength) {
      for(let i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
        
        if (bitDepth === 16) {
           sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0;
           view.setInt16(pos, sample, true);
           pos += 2;
        } else if (bitDepth === 32) {
           view.setFloat32(pos, sample, true);
           pos += 4;
        } else {
           // 24-bit
           sample = (sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF) | 0;
           view.setUint8(pos, (sample) & 0xFF);
           pos += 1;
           view.setUint8(pos, (sample >> 8) & 0xFF);
           pos += 1;
           view.setUint8(pos, (sample >> 16) & 0xFF);
           pos += 1;
        }
      }
      offset++;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  private createImpulseResponse(ctx: BaseAudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const noise = (Math.random() * 2 - 1);
        channelData[i] = noise * Math.pow(1 - i / length, decay);
      }
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
    if (this.compressor && this.context) {
      const threshold = -0.5 - (value * 12); 
      this.compressor.threshold.setTargetAtTime(threshold, this.context.currentTime, 0.1);
    }
  }

  setHdMode(enabled: boolean) {
    if (!this.context) return;
    const time = this.context.currentTime;
    
    if (enabled) {
      this.hdLowFilter?.gain.setTargetAtTime(4, time, 0.2); 
      this.hdMidDip?.gain.setTargetAtTime(-3, time, 0.2); 
      this.hdHighFilter?.gain.setTargetAtTime(6, time, 0.2); 
    } else {
      this.hdLowFilter?.gain.setTargetAtTime(0, time, 0.2);
      this.hdMidDip?.gain.setTargetAtTime(0, time, 0.2);
      this.hdHighFilter?.gain.setTargetAtTime(0, time, 0.2);
    }
  }

  setTheaterMode(enabled: boolean) {
    if (!this.context) return;
    const time = this.context.currentTime;
    
    if (enabled) {
      this.xCurveFilter?.gain.setTargetAtTime(-1.5, time, 0.5); 
      this.bassFilter?.gain.setTargetAtTime(4, time, 0.5); 
      this.midFilter?.gain.setTargetAtTime(3, time, 0.5); 
    } else {
      this.xCurveFilter?.gain.setTargetAtTime(0, time, 0.5);
      this.bassFilter?.gain.setTargetAtTime(0, time, 0.5);
      this.midFilter?.gain.setTargetAtTime(0, time, 0.5);
    }
  }

  applyPreset(name: string) {
    if (!this.context) return;
    const time = this.context.currentTime;
    
    this.bassFilter?.gain.setTargetAtTime(0, time, 0.2);
    this.trebleFilter?.gain.setTargetAtTime(0, time, 0.2);
    this.midFilter?.gain.setTargetAtTime(0, time, 0.2);

    switch(name) {
      case 'IMAX Enhanced':
        this.bassFilter?.gain.setTargetAtTime(8, time, 0.2);
        this.midFilter?.gain.setTargetAtTime(3, time, 0.2);
        this.trebleFilter?.gain.setTargetAtTime(2, time, 0.2);
        this.reverbNode!.buffer = this.createImpulseResponse(this.context, 2.5, 1.5);
        break;
      case 'THX Reference':
        this.midFilter?.gain.setTargetAtTime(1, time, 0.2);
        break;
      case 'Concert Auditorium':
        this.trebleFilter?.gain.setTargetAtTime(1, time, 0.2);
        this.reverbNode!.buffer = this.createImpulseResponse(this.context, 3.5, 2.0);
        break;
      case 'Vintage Cinema':
        this.midFilter?.gain.setTargetAtTime(5, time, 0.2);
        this.xCurveFilter?.gain.setTargetAtTime(-4, time, 0.2);
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
