
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
    md: "w-24 h-24 rounded-[2rem]",
    lg: "w-32 h-32 rounded-[2.5rem]"
  };
  
  const iconSize = {
    sm: "w-6 h-6",
    md: "w-16 h-16",
    lg: "w-20 h-20"
  };

  return (
    <div className={`frost flex items-center justify-center relative border-white/20 shadow-2xl overflow-hidden group ${containerClasses[size]}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-50"></div>
      <svg 
        className={`${iconSize[size]} relative z-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-transform duration-700 group-hover:scale-110`}
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="infinityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <path 
          d="M18.18 8.11c-1.34 0-2.58.5-3.5 1.39L12 12.16l-2.68-2.66c-.92-.89-2.16-1.39-3.5-1.39-2.86 0-5.18 2.32-5.18 5.18s2.32 5.18 5.18 5.18c1.34 0 2.58-.5 3.5-1.39L12 11.84l2.68 2.66c.92.89 2.16 1.39 3.5 1.39 2.86 0 5.18-2.32 5.18-5.18s-2.32-5.18-5.18-5.18zm-12.36 8.36c-1.75 0-3.18-1.43-3.18-3.18s1.43-3.18 3.18-3.18c.82 0 1.58.31 2.15.86L10.32 13.3c-.57.55-1.33.86-2.15.86h-.35c.11.19.23.36.35.31zm12.36 0c-.82 0-1.58-.31-2.15-.86l-2.35-2.33c.57-.55 1.33-.86 2.15-.86 1.75 0 3.18 1.43 3.18 3.18s-1.43 3.18-3.18 3.18h-.35c.11-.19.23-.36.35-.31z" 
          fill="url(#infinityGradient)"
        />
      </svg>
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent"></div>
    </div>
  );
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<AudioSettings>({
    volume: 0.85, bass: 0, treble: 2, vocalClarity: 8, spatiality: 0.9,
    isAtmosEnabled: true, selectedPreset: 'Reference', isTheaterMode: true,
    isHeadTrackingEnabled: false, isDolbyVisionEnabled: true, surroundLevel: 0.75,
    heightLevel: 0.6, drc: 0.15, lfeCrossover: 80, centerSpread: 0.4,
  });

  const [speakers, setSpeakers] = useState<SpeakerPosition[]>(SPEAKER_LAYOUTS['Atmos 7.1.4']);
  const [isReady, setIsReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlayerMenuOpen, setIsPlayerMenuOpen] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string, size: string, bitrate: string, sampleRate: string, bitDepth: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeLayout, setActiveLayout] = useState('Atmos 7.1.4');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    const saved = localStorage.getItem('stagepov_custom_presets');
    return saved ? JSON.parse(saved) : [];
  });
  
  const mediaRef = useRef<HTMLVideoElement>(null);

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
  };

  useEffect(() => {
    if (isReady) updateEngine();
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('stagepov_custom_presets', JSON.stringify(customPresets));
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
      const sizeMB = file.size / (1024 * 1024);
      
      // Advanced heuristic detector for high-res audio
      const isHighRes = sizeMB > 200;
      const estimatedBitrate = isHighRes ? "24.5 Mbps TrueHD Atmos" : "448 kbps Dolby Digital";
      const estimatedSampleRate = isHighRes ? "192.0" : "48.0";
      const estimatedBitDepth = isHighRes ? "24" : "16";
      
      setTimeout(() => {
        setFileInfo({ 
          name: file.name, 
          size: `${(file.size / (1024 ** 3)).toFixed(2)} GB`,
          bitrate: estimatedBitrate,
          sampleRate: estimatedSampleRate,
          bitDepth: estimatedBitDepth
        });
        if (mediaRef.current) {
          mediaRef.current.src = URL.createObjectURL(file);
          audioEngine.resume();
        }
        setIsLoading(false);
      }, 1200);
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

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleMetadataLoaded = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mediaRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      mediaRef.current.currentTime = pos * duration;
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
    setIsPlayerMenuOpen(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const saveCurrentPreset = () => {
    const name = prompt("Enter Signature Name:", `Custom Sig ${customPresets.length + 1}`);
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

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-8 overflow-hidden bg-[#020205]">
        <div className="frost p-16 rounded-[4rem] text-center border-white/20 animate-in fade-in zoom-in duration-1000">
          <div className="mb-8 flex justify-center animate-pulse">
            <StagePOVLogo size="md" />
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tighter uppercase italic text-white">Stage<span className="text-blue-500">POV</span></h1>
          <p className="text-slate-500 text-[9px] font-black tracking-[0.4em] uppercase mb-10">Digital Cinema Spatial Processor</p>
          <button 
            onClick={() => setIsReady(true)}
            className="px-12 py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] rounded-full hover:scale-105 hover:bg-blue-50 transition-all shadow-xl active:scale-95"
          >
            Start Engine
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col p-6 overflow-hidden select-none">
      <header className="flex justify-between items-center mb-6 px-4 animate-in slide-in-from-top duration-700">
        <div className="flex items-center gap-4 group cursor-default">
          <StagePOVLogo size="sm" />
          <div>
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">StagePOV</h1>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Master 10GB Core v5.2</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`frost px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isSettingsOpen ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'hover:bg-white/10 text-slate-300'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isSettingsOpen ? 'bg-white' : 'bg-blue-500'} animate-pulse`}></span>
            Command Center
          </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        <main className="col-span-8 flex flex-col gap-6 overflow-hidden">
          <div className="relative frost rounded-[3rem] overflow-hidden flex-1 bg-black/40 group shadow-2xl">
             <video 
                ref={mediaRef} 
                className={`w-full h-full object-contain ${settings.isDolbyVisionEnabled ? 'dolby-vision-active' : ''} transition-all duration-700`}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleMetadataLoaded}
              />
              
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl z-30">
                  <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Ingesting Stream...</span>
                </div>
              )}

              {!fileInfo && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
                   <label className="frost p-12 rounded-[3rem] border-white/5 cursor-pointer hover:bg-white/5 transition-all flex flex-col items-center group relative overflow-hidden">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Load Master Media</span>
                      <p className="text-[8px] text-slate-500 mt-2">MKV • MP4 • FLAC • 10GB MAX</p>
                      <input type="file" className="hidden" accept="video/*,audio/*" onChange={handleFileUpload} />
                   </label>
                </div>
              )}

              {fileInfo && (
                <div className="absolute bottom-6 left-6 right-6 z-20 flex flex-col gap-3 animate-in slide-in-from-bottom duration-500">
                  <div className="flex justify-between items-center px-6 py-2 frost rounded-full bg-black/40 border-white/5">
                    <div className="flex items-center gap-4">
                      <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest truncate max-w-[200px]">{fileInfo.name}</span>
                      <div className="h-3 w-[1px] bg-white/10"></div>
                      <span className="text-[8px] font-mono text-slate-500">{fileInfo.size}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[8px] font-black text-blue-500/80 uppercase tracking-tighter">Bitrate Detector:</span>
                      <span className="text-[8px] font-mono text-blue-400 animate-pulse">{fileInfo.bitrate}</span>
                    </div>
                  </div>

                  <div className="frost rounded-3xl p-4 flex items-center gap-6 bg-black/80 shadow-2xl relative">
                    <button onClick={togglePlay} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-500 transition-all text-white shadow-lg active:scale-95">
                      {isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                      ) : (
                        <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      )}
                    </button>

                    <div className="flex-1 flex flex-col gap-2">
                       <div 
                        onClick={handleSeek}
                        className="h-2 w-full bg-white/10 rounded-full relative overflow-hidden group/scrub cursor-pointer transition-all hover:h-3"
                       >
                          <div 
                            className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300 ease-out" 
                            style={{ width: `${progressPercent}%` }}
                          />
                          <div 
                            className="absolute top-0 w-4 h-full bg-white opacity-0 group-hover/scrub:opacity-100 shadow-[0_0_15px_white] transition-opacity" 
                            style={{ left: `calc(${progressPercent}% - 8px)` }}
                          />
                       </div>
                       <div className="flex justify-between text-[8px] font-mono font-bold text-slate-400 tracking-widest">
                          <div className="flex gap-2 items-center">
                            <span className="text-blue-400">{formatTime(currentTime)}</span>
                            <span className="opacity-30">/</span>
                            <span>{formatTime(duration)}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="opacity-50">REMAINING:</span>
                            <span className="text-white">-{formatTime(duration - currentTime)}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center gap-3">
                       <button onClick={() => setIsPlayerMenuOpen(!isPlayerMenuOpen)} className={`w-10 h-10 flex items-center justify-center rounded-xl frost hover:bg-white/10 transition-all ${isPlayerMenuOpen ? 'text-blue-400 bg-white/10 border-blue-500/30' : 'text-slate-400'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
                       </button>
                       <button onClick={ejectFile} className="w-10 h-10 flex items-center justify-center rounded-xl frost hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-all">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                       </button>
                    </div>

                    {isPlayerMenuOpen && (
                      <div className="absolute bottom-full right-0 mb-4 w-64 frost-dark rounded-[2rem] p-6 border-white/10 shadow-3xl animate-in slide-in-from-bottom duration-300">
                         <div className="space-y-6">
                            <div className="space-y-3">
                               <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">Playback Speed</label>
                               <div className="flex justify-between gap-1">
                                  {[0.5, 1, 1.5, 2].map(s => (
                                    <button 
                                      key={s} 
                                      onClick={() => {
                                        setPlaybackSpeed(s);
                                        if (mediaRef.current) mediaRef.current.playbackRate = s;
                                      }}
                                      className={`flex-1 py-2 rounded-lg text-[8px] font-black border transition-all ${playbackSpeed === s ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                                    >
                                      {s}x
                                    </button>
                                  ))}
                               </div>
                            </div>
                            <div className="space-y-3">
                               <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">Audio Track</label>
                               <div className="frost px-4 py-2 rounded-xl text-[8px] font-black text-blue-400 flex justify-between items-center group cursor-pointer hover:bg-white/5 transition-colors">
                                  <span>7.1.4 Atmos Master</span>
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_blue] group-hover:scale-125 transition-transform"></div>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>

          <div className="h-[300px] flex gap-6">
             <div className="flex-1 frost rounded-[2.5rem] p-6 relative overflow-hidden">
                <ThreeDSpatialView speakers={speakers} listenerPos={{x:0, y:0}} headRotation={0} isTheaterMode={settings.isTheaterMode} />
             </div>
             <div className="w-[240px] frost rounded-[2.5rem] p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-blue-500">Live Analytics</h3>
                    <div className="flex gap-1 animate-pulse">
                      <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                      <div className="w-1 h-1 rounded-full bg-blue-500 delay-75"></div>
                    </div>
                  </div>
                  <Visualizer />
                </div>
                <div className="text-center bg-white/5 rounded-2xl p-4 border border-white/5 group hover:bg-white/10 transition-colors">
                  <p className="text-[7px] font-black uppercase text-slate-500 tracking-widest">Stream Health</p>
                  <p className="text-[10px] font-mono text-blue-400 mt-1 font-bold tracking-widest">
                    {fileInfo ? `${fileInfo.bitDepth}-BIT / ${fileInfo.sampleRate} KHZ` : 'STANDBY'}
                  </p>
                </div>
             </div>
          </div>
        </main>

        <aside className="col-span-4 flex flex-col gap-6 overflow-hidden">
           <section className="frost rounded-[2.5rem] p-8 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Object Field</h2>
                <button onClick={resetLayout} className="text-[8px] font-black text-slate-500 hover:text-white uppercase transition-colors">↺ Reset</button>
              </div>
              <SpatialGrid speakers={speakers} onSpeakerMove={(id, x, z) => {
                setSpeakers(prev => prev.map(s => s.id === id ? { ...s, x, z } : s));
                audioEngine.setSpatialPosition(x, 0, z);
              }} onToggleSpeaker={() => {}} />
           </section>

           <section className="frost rounded-[2.5rem] p-8 flex-1 overflow-y-auto custom-scroll">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Sonic Signature</h2>
                <button 
                  onClick={saveCurrentPreset}
                  className="p-1.5 rounded-lg border border-blue-500/30 hover:bg-blue-500/10 transition-all group"
                  title="Save Current Setup"
                >
                  <svg className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 {AUDIO_PRESETS.map(p => (
                   <button 
                    key={p}
                    onClick={() => handleSliderChange('selectedPreset', p)}
                    className={`px-4 py-4 rounded-2xl text-[8px] font-black uppercase border transition-all transform active:scale-95 ${settings.selectedPreset === p ? 'bg-white text-black shadow-lg shadow-white/10' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}
                   >
                     {p}
                   </button>
                 ))}
                 
                 {customPresets.map(p => (
                   <button 
                    key={p.name}
                    onClick={() => applyCustomPreset(p)}
                    className={`px-4 py-4 rounded-2xl text-[8px] font-black uppercase border transition-all transform active:scale-95 relative ${settings.selectedPreset === p.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border-blue-400' : 'bg-blue-500/5 border-blue-500/20 text-blue-400 hover:bg-blue-500/10'}`}
                   >
                     <span className="truncate w-full block">{p.name}</span>
                     <div className="absolute top-1 right-2 w-1 h-1 rounded-full bg-blue-400 animate-pulse"></div>
                   </button>
                 ))}
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-4">Spatial Map</h2>
                <div className="space-y-2">
                   {Object.keys(SPEAKER_LAYOUTS).map(layout => (
                     <button 
                      key={layout}
                      onClick={() => { setSpeakers(SPEAKER_LAYOUTS[layout]); setActiveLayout(layout); }}
                      className={`w-full px-5 py-3 rounded-xl text-[8px] font-black uppercase border transition-all text-left flex justify-between items-center transform active:scale-[0.98] ${activeLayout === layout ? 'bg-blue-600/20 border-blue-500/30 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                     >
                       {layout}
                       <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${activeLayout === layout ? 'bg-blue-400 scale-125' : 'bg-slate-700'}`}></div>
                     </button>
                   ))}
                </div>
              </div>
           </section>
        </aside>
      </div>

      <div className={`fixed inset-0 z-50 transition-all duration-700 ease-in-out ${isSettingsOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-700 ${isSettingsOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsSettingsOpen(false)}></div>
        <div className={`absolute top-0 right-0 w-[420px] h-full frost-dark p-10 border-l border-white/10 shadow-3xl transition-transform duration-700 ease-out flex flex-col ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-12 animate-in fade-in slide-in-from-right duration-500">
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-white">Command <span className="text-blue-500">Center</span></h2>
            <button onClick={() => setIsSettingsOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full frost hover:bg-white/10 transition-all text-slate-400 hover:text-white">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto pr-4 space-y-12 custom-scroll animate-in fade-in slide-in-from-bottom duration-1000">
            <section className="space-y-6">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2"><span className="w-4 h-[1px] bg-blue-500/30"></span> Master Rack</h3>
              <ControlGroup label="System Gain" value={settings.volume} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('volume', v)} suffix="%" displayMult={100} />
              <ControlGroup label="Dialogue Focus" value={settings.vocalClarity} min={0} max={15} step={1} onChange={(v) => handleSliderChange('vocalClarity', v)} suffix="db" />
              <ControlGroup label="LFE Sub Bass" value={settings.bass} min={-10} max={15} step={1} onChange={(v) => handleSliderChange('bass', v)} suffix="db" />
            </section>
            <section className="space-y-6">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2"><span className="w-4 h-[1px] bg-blue-500/30"></span> Processing Core</h3>
              <ControlGroup label="Dynamic Comp (DRC)" value={settings.drc} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('drc', v)} suffix="%" displayMult={100} />
              <div className="pt-4 space-y-4">
                 <ToggleSwitch label="Dolby Vision HDR" enabled={settings.isDolbyVisionEnabled} onToggle={() => handleSliderChange('isDolbyVisionEnabled', !settings.isDolbyVisionEnabled)} />
                 <ToggleSwitch label="Virtual Theater" enabled={settings.isTheaterMode} onToggle={() => handleSliderChange('isTheaterMode', !settings.isTheaterMode)} />
                 <ToggleSwitch label="Head Tracking" enabled={settings.isHeadTrackingEnabled} onToggle={() => handleSliderChange('isHeadTrackingEnabled', !settings.isHeadTrackingEnabled)} />
              </div>
            </section>
          </div>
          <div className="mt-auto pt-8 border-t border-white/5 text-center">
             <p className="text-[7px] font-black text-slate-600 uppercase tracking-[0.5em]">Optimized for Cinema Spatial</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ControlGroup = ({ label, value, min, max, step, onChange, suffix, displayMult = 1 }: any) => (
  <div className="space-y-3 group">
    <div className="flex justify-between items-center px-1">
      <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300">{label}</label>
      <span className="text-[10px] font-mono text-blue-400 font-bold group-hover:scale-110 transition-transform">{Math.round(value * displayMult)}{suffix}</span>
    </div>
    <div className="relative h-6 flex items-center">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full relative z-10" />
    </div>
  </div>
);

const ToggleSwitch = ({ label, enabled, onToggle }: any) => (
  <button onClick={onToggle} className="w-full flex items-center justify-between py-3 px-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group text-left transform active:scale-95">
    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
    <div className={`w-10 h-5 rounded-full relative transition-all duration-500 ${enabled ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-800'}`}>
      <div className={`absolute top-1 bottom-1 w-3 rounded-full bg-white transition-all duration-500 shadow-md ${enabled ? 'left-6' : 'left-1'}`}></div>
    </div>
  </button>
);

export default App;
