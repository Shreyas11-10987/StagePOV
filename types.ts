
export interface AudioSettings {
  volume: number;
  bass: number;
  treble: number;
  vocalClarity: number;
  spatiality: number;
  isAtmosEnabled: boolean;
  selectedPreset: string;
  isTheaterMode: boolean;
  isHeadTrackingEnabled: boolean;
  isDolbyVisionEnabled: boolean;
  // New Surround Settings
  surroundLevel: number;
  heightLevel: number;
  drc: number; // Dynamic Range Compression
  lfeCrossover: number;
  centerSpread: number;
  // Advanced Calibration
  speakerDelay: number; // in milliseconds
  phaseAlignment: number; // in milliseconds (sub-sample fine tuning)
  // Quality Settings
  bitDepth: 16 | 24 | 32;
  sampleRate: number;
}

export interface SpeakerPosition {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  isActive: boolean;
}

export interface SpatialPreset {
  id: string;
  name: string;
  speakers: SpeakerPosition[];
  listenerPos: { x: number; y: number };
}

export interface EQBand {
  frequency: number;
  gain: number;
}
