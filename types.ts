
export interface AudioSettings {
  volume: number;
  bass: number;
  treble: number;
  vocalClarity: number;
  spatiality: number;
  reverbLevel: number;
  isAtmosEnabled: boolean;
  isHdAudioEnabled: boolean;
  selectedPreset: string;
  isTheaterMode: boolean;
  isHeadTrackingEnabled: boolean;
  isDolbyVisionEnabled: boolean;
  surroundLevel: number;
  heightLevel: number;
  drc: number;
  lfeCrossover: number;
  centerSpread: number;
  speakerDelay: number;
  phaseAlignment: number;
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

export interface VaultMedia {
  id: string;
  name: string;
  blob: Blob;
  size: number;
  type: string;
  dateAdded: number;
  duration?: number;
}

export interface VaultPlaylist {
  id: string;
  name: string;
  mediaIds: string[];
  dateCreated: number;
}
