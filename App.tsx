
import React, { useState, useRef, useEffect } from 'react';
import { AudioSettings, SpeakerPosition } from './types';
import { AUDIO_PRESETS, SPEAKER_LAYOUTS } from './constants';
import { audioEngine } from './services/audioEngine';
import { Visualizer } from './components/Visualizer';
import { SpatialGrid } from './components/SpatialGrid';
import { ThreeDSpatialView } from './components/ThreeDSpatialView';

interface CustomPreset {
  name: string;
  settings: AudioSettings;
  speakers: SpeakerPosition[];
}

const StagePOVLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const containerClasses = {
    sm: "w-10 h-10 rounded-xl",
    md: "w-20 h-20 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2rem]",
    lg: "w-24 h-24 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem]"
  };
  const iconSize = {
    sm: "w-6 h-6",
    md: "w-12 h-12 md:w-16 md:h-16",
    lg: "w-16 h-16 md:w-20 md:h-20"
  };

  return (
    <div className={`frost flex items-center justify-center relative border-white/20 shadow-2xl overflow-hidden group ${containerClasses[size]}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-50"></div>
      <svg 
        className={`${iconSize[size]} relative z-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-transform duration-700 group-hover:scale-110`}
        viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="infinityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <path d="M18.18 8.11c-1.34 0-2.58.5-3.5 1.39L12 12.16l-2.68-2.66c-.92-.89-2.16-1.39-3.5-1.39-2.86 0-5.18 2.32-5.18 5.18s2.32 5.18 5.18 5.18c1.34 0 2.58-.5 3.5-1.39L12 11.84l2.68 2.66c.92.89 2.16 1.39 3.5 1.39 2.86 0 5.18-2.32 5.18-5.18s-2.32-5.18-5.18-5.18zm-12.36 8.36c-1.75 0-3.18-1.43-3.18-3.18s1.43-3.18 3.18-3.18c.82 0 1.58.31 2.15.86L10.32 13.3c-.57.55-1.33.86-2.15.86h-.35c.11.19.23.36.35.31zm12.36 0c-.82 0-1.58-.31-2.15-.86l-2.35-2.33c.57-.55 1.33-.86 2.15-.86 1.75 0 3.18 1.43 3.18 3.18s-1.43 3.18-3.18 3.18h-.35c.11-.19.23-.36.35-.31z" fill="url(#infinityGradient)"/>
      </svg>
    </div>
  );
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<AudioSettings>({
    volume: 0.85, bass: 0, treble: 2, vocalClarity: 8, spatiality: 0.9,
    isAtmosEnabled: true, selectedPreset: 'Pure Direct', isTheaterMode: false,
    isHeadTrackingEnabled: false, isDolbyVisionEnabled: false, surroundLevel: 0.75,
    heightLevel: 0.6, drc: 0.1, lfeCrossover: 80, centerSpread: 0.4,
  });

  const [speakers, setSpeakers] = useState<SpeakerPosition[]>(SPEAKER_LAYOUTS['Atmos Music 7.1.4']);
  const [isReady, setIsReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'player' | 'spatial' | 'library'>('player');
  const [fileInfo, setFileInfo] = useState<{ name: string, size: string, bitrate: string, sampleRate: string, bitDepth: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeLayout, setActiveLayout] = useState('Atmos Music 7.1.4');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    const saved = localStorage.getItem('stagepov_music_presets');
    return saved ? JSON.parse(saved) : [];
  });
  
  const mediaRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (mediaRef.current && isReady) {
      audioEngine.init(mediaRef.current);
      updateEngine();
    }
  }, [isReady]);

  const updateEngine = () => {
    audioEngine.setVolume(settings.volume);
    audioEngine.setBass(settings.bass);
    audioEngine.setTreble(settings.treble);
    audioEngine.setVocalClarity(settings.vocalClarity);
    audioEngine.setTheaterMode(settings.isTheaterMode);
    audioEngine.setDRC(settings.drc);
    audioEngine.setHeightLevel(settings.heightLevel);
  };

  useEffect(() => {
    if (isReady) updateEngine();
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('stagepov_music_presets', JSON.stringify(customPresets));
  }, [customPresets]);

  const handleSliderChange = (key: keyof AudioSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetLayout = () => {
    setSpeakers(SPEAKER_LAYOUTS[activeLayout]);
    audioEngine.setSpatialPosition(0, 0, 0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && mediaRef.current) {
      setIsLoading(true);
      const isHiRes = file.name.toLowerCase().endsWith('.flac') || file.name.toLowerCase().endsWith('.wav');
      
      setTimeout(() => {
        setFileInfo({ 
          name: file.name, 
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          bitrate: isHiRes ? "Lossless HI-RES" : "AAC Master",
          sampleRate: isHiRes ? "192.0" : "44.1",
          bitDepth: isHiRes ? "24" : "16"
        });
        if (mediaRef.current) {
          mediaRef.current.src = URL.createObjectURL(file);
          audioEngine.resume();
        }
        setIsLoading(false);
      }, 1000);
    }
  };

  const togglePlay = () => {
    if (mediaRef.current) {
      if (mediaRef.current.paused) {
        mediaRef.current.play();
        setIsPlaying(true);
      } else {
        mediaRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const ejectFile = () => {
    if (mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.removeAttribute('src');
      mediaRef.current.load();
    }
    setFileInfo(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const saveCurrentPreset = () => {
    const name = prompt("Enter Sonic Identity Name:", `Sig ${customPresets.length + 1}`);
    if (name) {
      setCustomPresets(prev => [...prev, {
        name,
        settings: { ...settings, selectedPreset: name },
        speakers: [...speakers]
      }]);
    }
  };

  const applyCustomPreset = (p: CustomPreset) => {
    setSettings(p.settings);
    setSpeakers(p.speakers);
  };

  if (!isReady) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 bg-[#020205] z-[100]">
        <div className="frost p-10 md:p-16 rounded-[3rem] md:rounded-[4rem] text-center border-white/20 animate-in fade-in zoom-in duration-1000 w-full max-w-md">
          <div className="mb-6 md:mb-8 flex justify-center animate-pulse">
            <StagePOVLogo size="md" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tighter uppercase italic text-white">Stage<span className="text-blue-500">POV</span></h1>
          <p className="text-slate-500 text-[8px] md:text-[9px] font-black tracking-[0.4em] uppercase mb-10">High-Resolution Music Spatial Master</p>
          <button onClick={() => setIsReady(true)} className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-full hover:scale-105 transition-all shadow-xl active:scale-95">Initialize Master</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col p-4 md:p-6 overflow-hidden select-none bg-[#020205] text-white">
      {/* Header */}
      <header className="flex justify-between items-center mb-4 md:mb-6 px-2 md:px-4 shrink-0">
        <div className="flex items-center gap-3 md:gap-4 group cursor-default">
          <StagePOVLogo size="sm" />
          <div>
            <h1 className="text-[10px] md:text-xs font-black uppercase tracking-[0.15em] text-white">StagePOV</h1>
            <p className="text-[6px] md:text-[7px] font-bold text-slate-500 uppercase tracking-widest">Studio Engine v7.0</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => setIsGuideOpen(true)} className="frost w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full text-blue-400 hover:text-white transition-all">
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="frost px-4 md:px-6 py-2 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all bg-blue-600/10 text-blue-400 border-blue-500/20 flex items-center gap-2">
            <span className="hidden md:inline">Studio Rack</span>
            <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:grid md:grid-cols-12 gap-4 md:gap-6 overflow-hidden min-h-0">
        
        {/* Mobile Tabbed View / Desktop Grid Main */}
        <main className={`flex-1 flex flex-col gap-4 md:gap-6 overflow-hidden md:col-span-8 ${activeMobileTab !== 'player' && activeMobileTab !== 'spatial' ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Sonic Core Section - Visible in 'player' on mobile or always on desktop */}
          <div className={`relative frost rounded-[2rem] md:rounded-[3.5rem] overflow-hidden flex-1 bg-black/40 shadow-2xl flex flex-col items-center justify-center transition-all ${activeMobileTab === 'spatial' ? 'hidden md:flex' : 'flex'}`}>
            <audio ref={mediaRef} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onTimeUpdate={() => setCurrentTime(mediaRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(mediaRef.current?.duration || 0)} crossOrigin="anonymous" />
            
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-2xl z-30">
                <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Decoding Master...</span>
              </div>
            )}

            {!fileInfo && !isLoading ? (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <label className="frost p-10 md:p-16 rounded-[2.5rem] md:rounded-[4rem] border-white/5 cursor-pointer hover:bg-white/5 transition-all flex flex-col items-center group relative overflow-hidden">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                    <svg className="w-6 h-6 md:w-8 md:h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
                  </div>
                  <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em] text-white">Import Master</span>
                  <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                </label>
              </div>
            ) : fileInfo && (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 md:p-12 relative">
                <div className="w-48 h-48 md:w-64 md:h-64 rounded-full relative flex items-center justify-center mb-8">
                  <div className={`absolute inset-0 rounded-full border-[6px] md:border-[10px] border-blue-500/10 ${isPlaying ? 'animate-[spin_10s_linear_infinite]' : ''}`}></div>
                  <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-blue-600/20 to-transparent flex items-center justify-center border border-white/5 shadow-2xl backdrop-blur-md">
                    <svg className={`w-12 h-12 md:w-20 md:h-20 text-blue-500/40 ${isPlaying ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                  </div>
                </div>
                <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter truncate max-w-full px-4">{fileInfo.name}</h2>
                <p className="text-[8px] md:text-[9px] font-black text-blue-500 uppercase tracking-[0.4em] mt-2">{fileInfo.bitrate}</p>
              </div>
            )}

            {fileInfo && (
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <div className="frost rounded-3xl p-3 md:p-4 flex items-center gap-4 md:gap-6 bg-black/60 backdrop-blur-3xl shadow-2xl">
                  <button onClick={togglePlay} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-2xl bg-blue-600 text-white shrink-0 active:scale-90 transition-transform">
                    {isPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                  </button>
                  <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
                    </div>
                    <div className="flex justify-between text-[7px] md:text-[8px] font-mono font-bold text-slate-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>-{formatTime(duration - currentTime)}</span>
                    </div>
                  </div>
                  <button onClick={ejectFile} className="w-10 h-10 flex items-center justify-center rounded-xl frost text-red-500/60 shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Visualization / Spatial View - Switchable on mobile */}
          <div className={`h-[240px] md:h-[300px] flex flex-col md:flex-row gap-4 md:gap-6 ${activeMobileTab === 'player' ? 'flex' : (activeMobileTab === 'spatial' ? 'hidden md:flex' : 'hidden md:flex')}`}>
            <div className="flex-1 frost rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-6 relative overflow-hidden">
              <ThreeDSpatialView speakers={speakers} listenerPos={{x:0, y:0}} headRotation={0} isTheaterMode={settings.isTheaterMode} />
            </div>
            <div className="w-full md:w-[200px] lg:w-[240px] frost rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-6 flex md:flex-col justify-between items-center md:items-stretch gap-4">
              <div className="flex-1 md:flex-none space-y-3 w-full">
                <h3 className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-blue-500 flex justify-between">Spectral Health <span className="animate-pulse">●</span></h3>
                <Visualizer />
              </div>
              <div className="hidden md:block text-center bg-white/5 rounded-2xl p-3 border border-white/5">
                <p className="text-[6px] font-black uppercase text-slate-500 tracking-widest">Signal Chain</p>
                <p className="text-[8px] md:text-[9px] font-mono text-blue-400 mt-1 font-bold">{fileInfo ? `${fileInfo.bitDepth}-BIT / ${fileInfo.sampleRate} KHZ` : 'PCM READY'}</p>
              </div>
            </div>
          </div>
        </main>

        {/* Sidebar - Library/Spatial Grid - Visible in tabs on mobile */}
        <aside className={`flex-1 flex flex-col gap-4 md:gap-6 overflow-hidden md:col-span-4 ${activeMobileTab === 'player' ? 'hidden md:flex' : 'flex'}`}>
           <section className={`frost rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 flex flex-col shrink-0 ${activeMobileTab === 'library' ? 'hidden md:flex' : 'flex'}`}>
              <div className="flex justify-between items-center mb-6 md:mb-8">
                <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Spatial Topology</h2>
                <button onClick={resetLayout} className="text-[7px] md:text-[8px] font-black text-slate-500 uppercase">Reset</button>
              </div>
              <SpatialGrid speakers={speakers} onSpeakerMove={(id, x, z) => {
                setSpeakers(prev => prev.map(s => s.id === id ? { ...s, x, z } : s));
                audioEngine.setSpatialPosition(x, 0, z);
              }} onToggleSpeaker={() => {}} />
           </section>

           <section className={`frost rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 flex-1 overflow-y-auto custom-scroll ${activeMobileTab === 'spatial' ? 'hidden md:flex' : 'flex'}`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Sonic Signatures</h2>
                <button onClick={saveCurrentPreset} className="p-1.5 rounded-lg border border-blue-500/20 text-blue-400 hover:bg-blue-500/10"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg></button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 md:gap-3">
                 {AUDIO_PRESETS.map(p => <button key={p} onClick={() => handleSliderChange('selectedPreset', p)} className={`px-3 py-3 md:px-4 md:py-4 rounded-xl md:rounded-2xl text-[7px] md:text-[8px] font-black uppercase border transition-all ${settings.selectedPreset === p ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>{p}</button>)}
                 {customPresets.map(p => <button key={p.name} onClick={() => applyCustomPreset(p)} className={`px-3 py-3 rounded-xl text-[7px] font-black uppercase border transition-all ${settings.selectedPreset === p.name ? 'bg-blue-600 text-white shadow-lg border-blue-400' : 'bg-blue-500/5 border-blue-500/20 text-blue-400'}`}>{p.name}</button>)}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 mb-4">Stage Configurations</h2>
                <div className="space-y-2">
                   {Object.keys(SPEAKER_LAYOUTS).map(layout => <button key={layout} onClick={() => { setSpeakers(SPEAKER_LAYOUTS[layout]); setActiveLayout(layout); }} className={`w-full px-4 py-3 rounded-xl text-[7px] md:text-[8px] font-black uppercase border transition-all text-left flex justify-between items-center ${activeLayout === layout ? 'bg-blue-600/20 border-blue-500/30 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>{layout}<div className={`w-1 h-1 rounded-full ${activeLayout === layout ? 'bg-blue-400' : 'bg-slate-700'}`}></div></button>)}
                </div>
              </div>
           </section>
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden flex items-center justify-around h-16 mt-4 frost rounded-full px-6 shrink-0 border-white/10 shadow-2xl">
        <button onClick={() => setActiveMobileTab('player')} className={`flex flex-col items-center gap-1 transition-colors ${activeMobileTab === 'player' ? 'text-blue-400' : 'text-slate-500'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span className="text-[6px] font-black uppercase tracking-widest">Player</span>
        </button>
        <button onClick={() => setActiveMobileTab('spatial')} className={`flex flex-col items-center gap-1 transition-colors ${activeMobileTab === 'spatial' ? 'text-blue-400' : 'text-slate-500'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span className="text-[6px] font-black uppercase tracking-widest">Spatial</span>
        </button>
        <button onClick={() => setActiveMobileTab('library')} className={`flex flex-col items-center gap-1 transition-colors ${activeMobileTab === 'library' ? 'text-blue-400' : 'text-slate-500'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
          <span className="text-[6px] font-black uppercase tracking-widest">Presets</span>
        </button>
      </nav>

      {/* Overlays (Guide, Settings) */}
      <div className={`fixed inset-0 z-[110] transition-all duration-500 ${isGuideOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-500 ${isGuideOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsGuideOpen(false)}></div>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg frost-dark rounded-[2.5rem] border border-white/10 shadow-3xl transition-all duration-500 ${isGuideOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          <div className="p-8 md:p-12 overflow-y-auto max-h-[70vh] custom-scroll">
            <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase text-white mb-8">Music <span className="text-blue-500">Spatial</span> Intelligence</h2>
            <div className="space-y-8">
              <GuideItem title="Binaural Virtualization" content="Replicates speaker reflections for natural headphone listening." />
              <GuideItem title="Atmos Mastering" content="Adds 'air' and vertical dimension via simulated height channels." />
              <GuideItem title="Lossless Path" content="32-bit floating-point processing ensures bit-perfect audio." />
            </div>
            <button onClick={() => setIsGuideOpen(false)} className="w-full mt-10 py-3 bg-white/5 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">Close Intelligence</button>
          </div>
        </div>
      </div>

      <div className={`fixed inset-0 z-[120] transition-all duration-700 ${isSettingsOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-700 ${isSettingsOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsSettingsOpen(false)}></div>
        <div className={`absolute top-0 right-0 w-full md:w-[420px] h-full frost-dark p-8 md:p-10 border-l border-white/10 shadow-3xl transition-transform duration-700 ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-white">Studio <span className="text-blue-500">Rack</span></h2>
            <button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full frost hover:bg-white/10 transition-all text-slate-400">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-10 custom-scroll">
            <section className="space-y-6">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Gain Stage</h3>
              <ControlGroup label="Output Gain" value={settings.volume} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('volume', v)} suffix="%" displayMult={100} />
              <ControlGroup label="Vocal Presence" value={settings.vocalClarity} min={0} max={15} step={1} onChange={(v) => handleSliderChange('vocalClarity', v)} suffix="db" />
              <ControlGroup label="Height Air" value={settings.heightLevel} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('heightLevel', v)} suffix="%" displayMult={100} />
              <ControlGroup label="Bass Impact" value={settings.bass} min={-10} max={15} step={1} onChange={(v) => handleSliderChange('bass', v)} suffix="db" />
            </section>
            <section className="space-y-6">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Processing</h3>
              <ControlGroup label="Dynamic Control" value={settings.drc} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('drc', v)} suffix="%" displayMult={100} />
              <ToggleSwitch label="Analog Warmth" enabled={settings.isTheaterMode} onToggle={() => handleSliderChange('isTheaterMode', !settings.isTheaterMode)} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

const GuideItem = ({ title, content }: { title: string, content: string }) => (
  <div>
    <h4 className="text-[9px] font-black uppercase text-blue-500 tracking-[0.2em] mb-2 flex items-center gap-2">
      <span className="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_blue]"></span>
      {title}
    </h4>
    <p className="text-[12px] md:text-sm text-slate-400 leading-relaxed font-medium">{content}</p>
  </div>
);

const ControlGroup = ({ label, value, min, max, step, onChange, suffix, displayMult = 1, tooltip }: any) => {
  return (
    <div className="space-y-3 group relative">
      <div className="flex justify-between items-center px-1">
        <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</label>
        <span className="text-[10px] font-mono text-blue-400 font-bold">{Math.round(value * displayMult)}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full relative z-10 accent-blue-500" />
    </div>
  );
};

const ToggleSwitch = ({ label, enabled, onToggle }: any) => {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between py-4 px-5 rounded-2xl bg-white/5 border border-white/5 active:scale-95 transition-all">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className={`w-10 h-5 rounded-full relative transition-all duration-500 ${enabled ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-800'}`}>
        <div className={`absolute top-1 bottom-1 w-3 rounded-full bg-white transition-all duration-500 ${enabled ? 'left-6' : 'left-1'}`}></div>
      </div>
    </button>
  );
};

export default App;
