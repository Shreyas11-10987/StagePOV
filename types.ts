
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
