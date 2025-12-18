
import React, { useState, useRef, useEffect } from 'react';
import { AudioSettings, SpeakerPosition } from './types';
import { AUDIO_PRESETS, SPEAKER_LAYOUTS } from './constants';
import { audioEngine } from './services/audioEngine';
import { Visualizer } from './components/Visualizer';
import { SpatialGrid } from './components/SpatialGrid';
import { ThreeDSpatialView } from './components/ThreeDSpatialView';

interface CustomPreset {
  id: string;
  name: string;
  settings: AudioSettings;
  speakers: SpeakerPosition[];
  timestamp: number;
}

const StagePOVLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const dim = size === "sm" ? "w-8 h-8" : size === "md" ? "w-16 h-16" : "w-24 h-24";
  return (
    <div className={`${dim} frost flex items-center justify-center rounded-xl border-white/10 shadow-2xl relative overflow-hidden group`}>
      <div className="absolute inset-0 bg-blue-600/10 group-hover:bg-blue-600/20 transition-colors"></div>
      <svg className="w-1/2 h-1/2 text-blue-500 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
  const [activeLayout, setActiveLayout] = useState('Atmos Music 7.1.4');
  const [activeView, setActiveView] = useState<'deck' | 'stage' | 'vault'>('deck');
  const [isReady, setIsReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string, quality: string, sample: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    const saved = localStorage.getItem('stagepov_pro_vault');
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

  useEffect(() => { if (isReady) updateEngine(); }, [settings]);
  useEffect(() => { localStorage.setItem('stagepov_pro_vault', JSON.stringify(customPresets)); }, [customPresets]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && mediaRef.current) {
      const isLossless = file.name.match(/\.(flac|wav|alac)$/i);
      setFileInfo({ 
        name: file.name.replace(/\.[^/.]+$/, ""), 
        quality: isLossless ? "Lossless Master" : "High Quality",
        sample: isLossless ? "192.0 kHz / 24-bit" : "44.1 kHz / 16-bit"
      });
      mediaRef.current.src = URL.createObjectURL(file);
      audioEngine.resume();
    }
  };

  const togglePlay = () => {
    if (mediaRef.current) {
      if (mediaRef.current.paused) {
        mediaRef.current.play();
        audioEngine.resume();
      } else {
        mediaRef.current.pause();
      }
    }
  };

  const saveToVault = () => {
    const name = prompt("Signature Identity Name:");
    if (name) {
      setCustomPresets([{
        id: Math.random().toString(36).substr(2, 9),
        name,
        settings: { ...settings, selectedPreset: name },
        speakers: [...speakers],
        timestamp: Date.now()
      }, ...customPresets]);
    }
  };

  const deleteFromVault = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomPresets(prev => prev.filter(p => p.id !== id));
  };

  const NavItem = ({ id, label, icon }: { id: typeof activeView, label: string, icon: React.ReactNode }) => (
    <button 
      onClick={() => setActiveView(id)}
      className={`flex flex-col md:flex-row items-center gap-2 md:gap-4 px-4 py-3 rounded-2xl transition-all duration-300 ${activeView === id ? 'text-white bg-blue-600/20 border border-blue-500/30 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
    >
      {icon}
      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );

  if (!isReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#020205] p-6 z-[200]">
        <div className="text-center space-y-8 animate-in zoom-in duration-1000">
          <div className="flex justify-center"><StagePOVLogo size="lg" /></div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black italic text-white tracking-tighter">Stage<span className="text-blue-500">POV</span></h1>
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.6em]">Professional Suite V2.0</p>
          </div>
          <button onClick={() => setIsReady(true)} className="px-12 py-5 bg-white text-black font-black uppercase text-[11px] tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl">Initialize Engine</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-[#020205] text-white overflow-hidden">
      
      {/* Dynamic Navigation Bar */}
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-8 flex md:flex-col justify-between shrink-0 bg-black/40 backdrop-blur-3xl z-50">
        <div className="flex md:flex-col gap-6 items-center md:items-stretch w-full">
          <div className="hidden md:flex items-center gap-4 mb-12">
            <StagePOVLogo size="sm" />
            <div className="flex flex-col">
              <span className="font-black italic text-sm tracking-tighter uppercase leading-none">Stage<span className="text-blue-500">POV</span></span>
              <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Studio Suite</span>
            </div>
          </div>
          <nav className="flex md:flex-col gap-2 flex-1 justify-around md:justify-start w-full">
            <NavItem id="deck" label="The Deck" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
            <NavItem id="stage" label="The Stage" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>} />
            <NavItem id="vault" label="The Vault" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>} />
          </nav>
        </div>
        
        <button onClick={() => setIsSettingsOpen(true)} className="hidden md:flex items-center justify-between w-full px-5 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
          <div className="flex items-center gap-3">
             <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">DSP Rack</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
        </button>

        <button onClick={() => setIsSettingsOpen(true)} className="md:hidden w-12 h-12 flex items-center justify-center rounded-2xl frost border-white/20 active:scale-90 transition-transform">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
        </button>
      </aside>

      {/* Main Console Engine */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020205] relative overflow-hidden">
        <audio ref={mediaRef} 
               onPlay={() => setIsPlaying(true)} 
               onPause={() => setIsPlaying(false)} 
               onTimeUpdate={() => setCurrentTime(mediaRef.current?.currentTime || 0)} 
               onLoadedMetadata={() => setDuration(mediaRef.current?.duration || 0)} />

        <div className="flex-1 overflow-y-auto custom-scroll p-4 md:p-12 pb-24 md:pb-12 h-full">
          
          {/* DECK VIEW: Master Playback Console */}
          {activeView === 'deck' && (
            <div className="h-full flex flex-col max-w-5xl mx-auto animate-in fade-in duration-700">
              <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                {!fileInfo ? (
                  <label className="frost w-full max-w-sm aspect-square rounded-[3.5rem] border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group p-10 text-center">
                    <div className="w-24 h-24 rounded-[2rem] bg-blue-500/10 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-500 shadow-xl">
                      <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    </div>
                    <span className="text-sm font-black uppercase tracking-[0.4em] text-white">Ingest Master File</span>
                    <p className="text-[10px] text-slate-500 mt-4 font-medium uppercase tracking-widest">Supports FLAC, WAV, ALAC, MP3</p>
                    <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                  </label>
                ) : (
                  <div className="w-full flex flex-col items-center text-center">
                    <div className="relative w-64 h-64 md:w-96 md:h-96 mb-16 flex items-center justify-center">
                       <div className={`absolute inset-0 rounded-full border border-blue-500/5 ${isPlaying ? 'animate-[spin_40s_linear_infinite]' : ''}`}></div>
                       <div className={`absolute inset-8 rounded-full border border-blue-500/20 ${isPlaying ? 'animate-[spin_25s_linear_reverse_infinite]' : ''}`}></div>
                       <div className="absolute inset-16 rounded-full bg-gradient-to-br from-blue-600/10 to-transparent backdrop-blur-3xl border border-white/10 shadow-[0_0_100px_rgba(37,99,235,0.1)] flex items-center justify-center overflow-hidden">
                          <Visualizer />
                       </div>
                    </div>
                    <div className="space-y-6 px-6 max-w-2xl">
                      <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase truncate drop-shadow-2xl">{fileInfo.name}</h2>
                      <div className="flex flex-wrap gap-3 justify-center">
                         <span className="px-4 py-1.5 rounded-full bg-blue-500 text-black text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">{fileInfo.quality}</span>
                         <span className="px-4 py-1.5 rounded-full bg-white/5 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-white/10">{fileInfo.sample}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {fileInfo && (
                <div className="w-full max-w-3xl mx-auto frost p-6 md:p-10 rounded-[3rem] border-white/10 shadow-3xl bg-black/40 mt-8">
                   <div className="flex flex-col md:flex-row items-center gap-8">
                      <div className="flex items-center gap-6 shrink-0">
                        <button onClick={() => { if(mediaRef.current) mediaRef.current.currentTime -= 10 }} className="text-slate-500 hover:text-white transition-colors active:scale-90">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6L11 18zM11.5 12l8.5 6V6l-8.5 6z"/></svg>
                        </button>
                        <button onClick={togglePlay} className="w-20 h-20 rounded-[2rem] bg-white text-black flex items-center justify-center hover:scale-105 active:scale-90 transition-all shadow-2xl">
                          {isPlaying ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                        </button>
                        <button onClick={() => { if(mediaRef.current) mediaRef.current.currentTime += 10 }} className="text-slate-500 hover:text-white transition-colors active:scale-90">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                        </button>
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-4 w-full">
                         <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative group/seek cursor-pointer" 
                              onClick={(e) => {
                                if(mediaRef.current && duration) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const pos = (e.clientX - rect.left) / rect.width;
                                  mediaRef.current.currentTime = pos * duration;
                                }
                              }}>
                            <div className="h-full bg-blue-600 transition-all duration-300 relative rounded-full" style={{ width: `${(currentTime/duration)*100}%` }}>
                               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full scale-0 group-hover/seek:scale-100 transition-transform shadow-xl"></div>
                            </div>
                         </div>
                         <div className="flex justify-between text-[11px] font-mono font-bold tracking-tighter">
                            <span className="text-blue-500">{formatTime(currentTime)}</span>
                            <span className="text-slate-600">{formatTime(duration)}</span>
                         </div>
                      </div>

                      <button onClick={() => {
                        if (mediaRef.current) {
                          mediaRef.current.pause();
                          if (mediaRef.current.src.startsWith('blob:')) URL.revokeObjectURL(mediaRef.current.src);
                          mediaRef.current.removeAttribute('src');
                          mediaRef.current.load();
                        }
                        setFileInfo(null);
                        setIsPlaying(false);
                      }} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all active:scale-90">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                   </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE VIEW: Advanced Spatial Arrangement */}
          {activeView === 'stage' && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-10 max-w-7xl mx-auto animate-in fade-in duration-700">
               <div className="lg:col-span-8 flex flex-col gap-10 h-full">
                  <div className="flex-1 frost rounded-[3.5rem] p-6 relative border-white/5 overflow-hidden min-h-[450px] shadow-3xl">
                     <ThreeDSpatialView speakers={speakers} listenerPos={{x:0, y:0}} headRotation={0} isTheaterMode={settings.isTheaterMode} />
                  </div>
                  <div className="frost rounded-[3rem] p-10 bg-black/40 border-white/10 shadow-2xl">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                        <div className="space-y-1">
                          <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-500">Spatial Topology</h3>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">DRAG NODES TO RECONFIGURE SOUNDSTAGE</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {Object.keys(SPEAKER_LAYOUTS).map(l => (
                             <button key={l} onClick={() => { setSpeakers(SPEAKER_LAYOUTS[l]); setActiveLayout(l); }} 
                                     className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${activeLayout === l ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}>
                               {l}
                             </button>
                           ))}
                        </div>
                     </div>
                     <div className="h-72"><SpatialGrid speakers={speakers} onSpeakerMove={(id, x, z) => {
                        setSpeakers(prev => prev.map(s => s.id === id ? { ...s, x, z } : s));
                        audioEngine.setSpatialPosition(x, 0, z);
                     }} onToggleSpeaker={() => {}} /></div>
                  </div>
               </div>
               
               <aside className="lg:col-span-4 space-y-10">
                  <div className="frost rounded-[3rem] p-10 border-white/10 bg-black/40 shadow-2xl h-full flex flex-col">
                     <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-500 mb-8 flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                       Active Object Matrix
                     </h3>
                     <div className="flex-1 overflow-y-auto custom-scroll space-y-4 pr-2">
                        {speakers.filter(s => s.isActive).map(s => (
                          <div key={s.id} className="flex items-center justify-between p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                             <div className="flex items-center gap-4">
                                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"></div>
                                <div className="flex flex-col">
                                   <span className="text-[11px] font-black text-white uppercase tracking-widest">{s.name}</span>
                                   <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{s.id} · SPATIAL_OBJ</span>
                                </div>
                             </div>
                             <div className="text-[9px] font-mono text-slate-500 group-hover:text-blue-400 transition-colors bg-black/20 px-3 py-1.5 rounded-xl border border-white/5">
                               {s.x.toFixed(2)} | {s.z.toFixed(2)}
                             </div>
                          </div>
                        ))}
                     </div>
                     <div className="mt-8 pt-8 border-t border-white/5">
                        <button onClick={() => setSpeakers(SPEAKER_LAYOUTS[activeLayout])} className="w-full py-5 rounded-2xl bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all active:scale-95">Reset Stage Vectors</button>
                     </div>
                  </div>
               </aside>
            </div>
          )}

          {/* VAULT VIEW: Preset & Identity Management */}
          {activeView === 'vault' && (
            <div className="max-w-6xl mx-auto space-y-20 animate-in fade-in duration-700">
               <header className="flex flex-col md:flex-row justify-between items-end md:items-center gap-8 border-b border-white/5 pb-12">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase">The <span className="text-blue-500">Vault</span></h2>
                    <p className="text-slate-500 text-[11px] font-bold uppercase tracking-[0.5em]">Studio Mastering Presets & Sound Signatures</p>
                  </div>
                  <button onClick={saveToVault} className="px-10 py-5 bg-blue-600 text-white font-black uppercase text-[11px] tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-4 group">
                    <div className="w-5 h-5 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                    </div>
                    Commit Signature
                  </button>
               </header>

               <section className="space-y-12">
                  <div className="flex items-center gap-6">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 shrink-0">Reference Masters</h3>
                    <div className="h-[2px] bg-gradient-to-r from-white/10 to-transparent flex-1"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {AUDIO_PRESETS.map(p => (
                      <button key={p} 
                              onClick={() => setSettings(prev => ({ ...prev, selectedPreset: p }))}
                              className={`text-left p-10 rounded-[3rem] border transition-all group relative overflow-hidden ${settings.selectedPreset === p ? 'bg-white text-black border-white shadow-[0_30px_60px_-15px_rgba(255,255,255,0.2)] scale-[1.03] z-10' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:border-white/20'}`}>
                         <div className="relative z-10">
                           <h4 className="text-xl font-black italic tracking-tight uppercase mb-6">{p}</h4>
                           <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-1.5 rounded-full ${settings.selectedPreset === p ? 'bg-black animate-pulse' : 'bg-blue-500'}`}></div>
                              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{settings.selectedPreset === p ? 'Active Engine State' : 'Factory Calibrated'}</span>
                           </div>
                         </div>
                         <div className="absolute -bottom-10 -right-10 w-40 h-40 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                            <StagePOVLogo />
                         </div>
                         <div className="absolute top-10 right-10 text-[8px] font-black uppercase opacity-20 tracking-widest">MST-001</div>
                      </button>
                    ))}
                  </div>
               </section>

               <section className="space-y-12">
                  <div className="flex items-center gap-6">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 shrink-0">Studio Identities</h3>
                    <div className="h-[2px] bg-gradient-to-r from-white/10 to-transparent flex-1"></div>
                  </div>
                  {customPresets.length === 0 ? (
                    <div className="frost rounded-[3.5rem] py-32 text-center border-white/10 opacity-40 border-dashed">
                       <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-500">Vault Cache Empty · Commit a signature to begin</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {customPresets.map(p => (
                        <div key={p.id} 
                             onClick={() => { setSettings(p.settings); setSpeakers(p.speakers); }}
                             className={`text-left p-10 rounded-[3.5rem] border cursor-pointer transition-all group relative overflow-hidden ${settings.selectedPreset === p.name ? 'bg-blue-600 text-white border-blue-400 shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)] scale-[1.03] z-10' : 'bg-blue-600/5 border-blue-500/10 text-blue-400 hover:bg-blue-600/10'}`}>
                           <div className="relative z-10 pr-12">
                             <h4 className="text-xl font-black italic tracking-tight uppercase mb-6 truncate">{p.name}</h4>
                             <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black uppercase tracking-widest bg-black/10 px-3 py-1.5 rounded-full border border-white/5">User Identity</span>
                                <span className="text-[8px] font-mono opacity-50 uppercase tracking-tighter">ID: {p.id}</span>
                             </div>
                           </div>
                           <button onClick={(e) => deleteFromVault(p.id, e)} className="absolute top-10 right-10 w-10 h-10 flex items-center justify-center rounded-xl bg-black/10 text-white/50 hover:bg-white/20 hover:text-white transition-all opacity-0 group-hover:opacity-100 active:scale-90">
                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                           </button>
                        </div>
                      ))}
                    </div>
                  )}
               </section>
            </div>
          )}

        </div>
      </main>

      {/* STUDIO RACK: Hardware Processing Control Overlay */}
      <div className={`fixed inset-0 z-[150] transition-all duration-700 ${isSettingsOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-black/85 backdrop-blur-xl transition-opacity duration-700 ${isSettingsOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsSettingsOpen(false)}></div>
        <div className={`absolute top-0 right-0 h-full w-full md:w-[500px] frost-dark border-l border-white/10 p-10 md:p-16 shadow-3xl transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1) ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
           <header className="flex justify-between items-center mb-16">
              <div className="space-y-1">
                <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">Studio <span className="text-blue-500">Rack</span></h2>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">HARDWARE ABSTRACTION v7.0.4</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-slate-400 group">
                <svg className="w-6 h-6 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
           </header>
           
           <div className="flex-1 overflow-y-auto pr-4 space-y-16 custom-scroll">
              <section className="space-y-10">
                 <div className="flex items-center gap-4">
                   <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.5em] shrink-0">Master Gain</h3>
                   <div className="h-px bg-blue-500/20 flex-1"></div>
                 </div>
                 <ControlGroup label="Main Volume" value={settings.volume} min={0} max={1} step={0.01} onChange={v => setSettings(prev => ({ ...prev, volume: v }))} suffix="%" displayMult={100} />
                 <ControlGroup label="Bass Extension" value={settings.bass} min={-10} max={15} step={1} onChange={v => setSettings(prev => ({ ...prev, bass: v }))} suffix="db" />
                 <ControlGroup label="Treble Presence" value={settings.treble} min={-10} max={15} step={1} onChange={v => setSettings(prev => ({ ...prev, treble: v }))} suffix="db" />
              </section>

              <section className="space-y-10">
                 <div className="flex items-center gap-4">
                   <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.5em] shrink-0">Atmos Processing</h3>
                   <div className="h-px bg-blue-500/20 flex-1"></div>
                 </div>
                 <ControlGroup label="Object Clarity" value={settings.vocalClarity} min={0} max={15} step={1} onChange={v => setSettings(prev => ({ ...prev, vocalClarity: v }))} suffix="db" />
                 <ControlGroup label="Height Intensity" value={settings.heightLevel} min={0} max={1} step={0.01} onChange={v => setSettings(prev => ({ ...prev, heightLevel: v }))} suffix="%" displayMult={100} />
                 <ToggleSwitch label="Analog Saturation" enabled={settings.isTheaterMode} onToggle={() => setSettings(prev => ({ ...prev, isTheaterMode: !prev.isTheaterMode }))} />
                 <ControlGroup label="Dynamic Range" value={settings.drc} min={0} max={1} step={0.01} onChange={v => setSettings(prev => ({ ...prev, drc: v }))} suffix="%" displayMult={100} />
              </section>
           </div>
           
           <footer className="mt-16 pt-10 border-t border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">System Online</span>
              </div>
              <span className="text-[9px] font-mono text-slate-700 uppercase">KERNEL_V7_STABLE</span>
           </footer>
        </div>
      </div>

    </div>
  );

  function formatTime(t: number) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
};

const ControlGroup = ({ label, value, min, max, step, onChange, suffix, displayMult = 1 }: any) => (
  <div className="space-y-5 group">
    <div className="flex justify-between items-center">
      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-white transition-colors">{label}</label>
      <div className="px-3 py-1 rounded-lg bg-blue-600/10 border border-blue-500/20">
        <span className="text-[12px] font-mono text-blue-400 font-black">{Math.round(value * displayMult)}{suffix}</span>
      </div>
    </div>
    <div className="relative h-6 flex items-center">
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-blue-500 bg-white/5 h-[6px] rounded-full appearance-none cursor-pointer" />
    </div>
  </div>
);

const ToggleSwitch = ({ label, enabled, onToggle }: any) => (
  <button onClick={onToggle} className="w-full flex items-center justify-between py-6 px-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group active:scale-[0.98]">
    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">{label}</span>
    <div className={`w-14 h-7 rounded-full relative transition-all duration-500 ${enabled ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'bg-slate-800'}`}>
      <div className={`absolute top-1.5 bottom-1.5 w-4 rounded-full bg-white transition-all duration-500 shadow-lg ${enabled ? 'left-8' : 'left-2'}`}></div>
    </div>
  </button>
);

export default App;
