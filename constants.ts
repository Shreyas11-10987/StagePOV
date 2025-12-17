
import { SpeakerPosition } from './types';

export const SPEAKER_LAYOUTS: Record<string, SpeakerPosition[]> = {
  'Stereo 2.0': [
    { id: 'FL', name: 'Front Left', x: -1, y: 0, z: 1, isActive: true },
    { id: 'FR', name: 'Front Right', x: 1, y: 0, z: 1, isActive: true },
  ],
  'Surround 5.1': [
    { id: 'FL', name: 'Front Left', x: -1, y: 0, z: 1, isActive: true },
    { id: 'FC', name: 'Front Center', x: 0, y: 0, z: 1, isActive: true },
    { id: 'FR', name: 'Front Right', x: 1, y: 0, z: 1, isActive: true },
    { id: 'SL', name: 'Surround Left', x: -1.2, y: 0, z: 0, isActive: true },
    { id: 'SR', name: 'Surround Right', x: 1.2, y: 0, z: 0, isActive: true },
    { id: 'LFE', name: 'Subwoofer', x: 0.5, y: -0.5, z: 0.8, isActive: true },
  ],
  'Surround 7.1': [
    { id: 'FL', name: 'Front Left', x: -1, y: 0, z: 1, isActive: true },
    { id: 'FC', name: 'Front Center', x: 0, y: 0, z: 1, isActive: true },
    { id: 'FR', name: 'Front Right', x: 1, y: 0, z: 1, isActive: true },
    { id: 'SL', name: 'Surround Left', x: -1.5, y: 0, z: 0, isActive: true },
    { id: 'SR', name: 'Surround Right', x: 1.5, y: 0, z: 0, isActive: true },
    { id: 'RL', name: 'Rear Left', x: -1, y: 0, z: -1, isActive: true },
    { id: 'RR', name: 'Rear Right', x: 1, y: 0, z: -1, isActive: true },
    { id: 'LFE', name: 'Subwoofer', x: 0.5, y: -0.5, z: 0.8, isActive: true },
  ],
  'Atmos 7.1.4': [
    { id: 'FL', name: 'Front Left', x: -1, y: 0, z: 1, isActive: true },
    { id: 'FC', name: 'Front Center', x: 0, y: 0, z: 1, isActive: true },
    { id: 'FR', name: 'Front Right', x: 1, y: 0, z: 1, isActive: true },
    { id: 'SL', name: 'Surround Left', x: -1.5, y: 0, z: 0.3, isActive: true },
    { id: 'SR', name: 'Surround Right', x: 1.5, y: 0, z: 0.3, isActive: true },
    { id: 'RL', name: 'Rear Left', x: -1, y: 0, z: -1, isActive: true },
    { id: 'RR', name: 'Rear Right', x: 1, y: 0, z: -1, isActive: true },
    { id: 'TFL', name: 'Top Front Left', x: -0.8, y: 1, z: 0.8, isActive: true },
    { id: 'TFR', name: 'Top Front Right', x: 0.8, y: 1, z: 0.8, isActive: true },
    { id: 'TRL', name: 'Top Rear Left', x: -0.8, y: 1, z: -0.8, isActive: true },
    { id: 'TRR', name: 'Top Rear Right', x: 0.8, y: 1, z: -0.8, isActive: true },
    { id: 'LFE', name: 'Subwoofer', x: 0.5, y: -0.5, z: 0.8, isActive: true },
  ]
};

export const DEFAULT_SPEAKERS = SPEAKER_LAYOUTS['Atmos 7.1.4'];

export const AUDIO_PRESETS = [
  'Reference',
  'Cinema Focus',
  'Action Boost',
  'Warm Acoustic',
  'Voice Only',
  'Night Cinema'
];
