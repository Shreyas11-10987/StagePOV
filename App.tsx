
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
  id: string;
}

const StagePOVLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const containerSize = size === "sm" ? "w-8 h-8" : size === "md" ? "w-16 h-16" : "w-24 h-24";
  return (
    <div className={`${containerSize} frost flex items-center justify-center rounded-xl border-white/10 shadow-xl overflow-hidden`}>
      <svg className="w-2/3 h-2/3 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
  // Added missing activeLayout state
  const [activeLayout, setActiveLayout] = useState<string>('Atmos Music 7.1.4');
  const [isReady, setIsReady] = useState(false);
  const [activeView, setActiveView] = useState<'deck' | 'stage' | 'vault'>('deck');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string, bitrate: string, sampleRate: string, bitDepth: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    const saved = localStorage.getItem('stagepov_v2_presets');
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
    localStorage.setItem('stagepov_v2_presets', JSON.stringify(customPresets));
  }, [customPresets]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && mediaRef.current) {
      const isHiRes = file.name.toLowerCase().endsWith('.flac') || file.name.toLowerCase().endsWith('.wav');
      setFileInfo({ 
        name: file.name.replace(/\.[^/.]+$/, ""), 
        bitrate: isHiRes ? "Master Quality" : "Hi-Fi Plus",
        sampleRate: isHiRes ? "192.0" : "44.1",
        bitDepth: isHiRes ? "24" : "16"
      });
      mediaRef.current.src = URL.createObjectURL(file);
      audioEngine.resume();
    }
  };

  const ejectFile = () => {
    if (mediaRef.current) {
      mediaRef.current.pause();
      if (mediaRef.current.src.startsWith('blob:')) URL.revokeObjectURL(mediaRef.current.src);
      mediaRef.current.removeAttribute('src');
      mediaRef.current.load();
    }
    setFileInfo(null);
    setIsPlaying(false);
  };

  // Added missing togglePlay function
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

  const savePreset = () => {
    const name = prompt("Signature Identity Name:");
    if (name) {
      setCustomPresets([...customPresets, {
        id: Date.now().toString(),
        name,
        settings: { ...settings, selectedPreset: name },
        speakers: [...speakers]
      }]);
    }
  };

  const deletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomPresets(customPresets.filter(p => p.id !== id));
  };

  const NavItem = ({ id, label, icon }: { id: typeof activeView, label: string, icon: React.ReactNode }) => (
    <button 
      onClick={() => setActiveView(id)}
      className={`flex flex-col md:flex-row items-center gap-2 md:gap-4 px-4 py-3 rounded-2xl transition-all duration-300 ${activeView === id ? 'text-white bg-blue-600/20 shadow-[0_0_20px_rgba(37,99,235,0.1)] border border-blue-500/30' : 'text-slate-500 hover:text-slate-300'}`}
    >
      {icon}
      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );

  if (!isReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#020205] p-6">
        <div className="text-center animate-in zoom-in duration-1000">
          <div className="mb-8 flex justify-center"><StagePOVLogo size="lg" /></div>
          <h1 className="text-4xl font-black italic text-white tracking-tighter mb-2">Stage<span className="text-blue-500">POV</span></h1>
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.5em] mb-12">Universal Spatial Engine</p>
          <button onClick={() => setIsReady(true)} className="px-12 py-5 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all">Initialize Studio</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-[#020205] text-white overflow-hidden font-sans">
      
      {/* Desktop Sidebar / Mobile Top Bar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-8 flex md:flex-col justify-between shrink-0 bg-black/20">
        <div className="flex md:flex-col gap-6 items-center md:items-stretch">
          <div className="hidden md:flex items-center gap-3 mb-10">
            <StagePOVLogo size="sm" />
            <h1 className="font-black italic text-xs tracking-tighter uppercase text-white">Stage<span className="text-blue-500">POV</span></h1>
          </div>
          <nav className="flex md:flex-col gap-2 flex-1 justify-around md:justify-start">
            <NavItem id="deck" label="The Deck" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>} />
            <NavItem id="stage" label="The Stage" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>} />
            <NavItem id="vault" label="The Vault" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>} />
          </nav>
        </div>
        <button onClick={() => setIsSettingsOpen(true)} className="hidden md:flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10 hover:bg-white/5 transition-all">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573 1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Settings</span>
        </button>
        <button onClick={() => setIsSettingsOpen(true)} className="md:hidden w-12 h-12 flex items-center justify-center rounded-full frost border-white/20">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
        </button>
      </aside>

      {/* Main Experience Engine */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020205] relative">
        <audio ref={mediaRef} 
               onPlay={() => setIsPlaying(true)} 
               onPause={() => setIsPlaying(false)} 
               onTimeUpdate={() => setCurrentTime(mediaRef.current?.currentTime || 0)} 
               onLoadedMetadata={() => setDuration(mediaRef.current?.duration || 0)} />

        {/* View Transitioning Content */}
        <div className="flex-1 overflow-y-auto custom-scroll p-4 md:p-12 pb-24 md:pb-12">
          
          {/* DECK: Player View */}
          {activeView === 'deck' && (
            <div className="h-full flex flex-col max-w-5xl mx-auto animate-in fade-in duration-500">
              <div className="flex-1 flex flex-col items-center justify-center py-12">
                {!fileInfo ? (
                  <label className="frost w-full max-w-md aspect-square rounded-[3rem] border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group">
                    <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-white/50">Load Studio Master</span>
                    <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                  </label>
                ) : (
                  <div className="w-full flex flex-col items-center text-center">
                    <div className="relative w-64 h-64 md:w-80 md:h-80 mb-12">
                       <div className={`absolute inset-0 rounded-full border border-blue-500/10 ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`}></div>
                       <div className="absolute inset-4 rounded-full bg-gradient-to-br from-blue-600/5 to-transparent backdrop-blur-3xl border border-white/5 shadow-2xl flex items-center justify-center">
                          <Visualizer />
                       </div>
                    </div>
                    <div className="space-y-4 px-6">
                      <h2 className="text-2xl md:text-4xl font-black italic tracking-tighter text-white uppercase">{fileInfo.name}</h2>
                      <div className="flex gap-3 justify-center">
                         <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase tracking-widest">{fileInfo.bitrate}</span>
                         <span className="px-3 py-1 rounded-full bg-white/5 text-slate-500 text-[9px] font-black uppercase tracking-widest">{fileInfo.sampleRate} KHZ</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {fileInfo && (
                <div className="w-full max-w-3xl mx-auto frost p-6 md:p-8 rounded-[2.5rem] border-white/10 shadow-3xl">
                   <div className="flex items-center gap-6">
                      <button onClick={() => { if(mediaRef.current) mediaRef.current.currentTime -= 10 }} className="text-slate-500 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6L11 18zM11.5 12l8.5 6V6l-8.5 6z"/></svg>
                      </button>
                      <button onClick={togglePlay} className="w-16 h-16 rounded-3xl bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl">
                        {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                      </button>
                      <button onClick={() => { if(mediaRef.current) mediaRef.current.currentTime += 10 }} className="text-slate-500 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                      </button>
                      
                      <div className="flex-1 flex flex-col gap-2 min-w-0">
                         <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative group/seek cursor-pointer" 
                              onClick={(e) => {
                                if(mediaRef.current && duration) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const pos = (e.clientX - rect.left) / rect.width;
                                  mediaRef.current.currentTime = pos * duration;
                                }
                              }}>
                            <div className="h-full bg-blue-600 transition-all duration-300 relative" style={{ width: `${(currentTime/duration)*100}%` }}>
                               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full scale-0 group-hover/seek:scale-100 transition-transform shadow-lg"></div>
                            </div>
                         </div>
                         <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500 tracking-tighter">
                            <span className="text-blue-500">{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                         </div>
                      </div>

                      <button onClick={ejectFile} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                      </button>
                   </div>
                </div>
              )}
            </div>
          )}

          {/* STAGE: Spatial Positioning View */}
          {activeView === 'stage' && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto animate-in fade-in duration-500">
               <div className="lg:col-span-8 flex flex-col gap-8 h-full">
                  <div className="flex-1 frost rounded-[3rem] p-4 relative border-white/5 overflow-hidden min-h-[400px]">
                     <ThreeDSpatialView speakers={speakers} listenerPos={{x:0, y:0}} headRotation={0} isTheaterMode={settings.isTheaterMode} />
                  </div>
                  <div className="frost rounded-[2.5rem] p-8 bg-black/40 border-white/5">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Topology Matrix</h3>
                        <div className="flex gap-2">
                           {Object.keys(SPEAKER_LAYOUTS).map(l => (
                             <button key={l} onClick={() => { setSpeakers(SPEAKER_LAYOUTS[l]); setActiveLayout(l); }} 
                                     className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${activeLayout === l ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                               {l.split(' ')[0]}
                             </button>
                           ))}
                        </div>
                     </div>
                     <div className="h-64"><SpatialGrid speakers={speakers} onSpeakerMove={(id, x, z) => {
                        setSpeakers(speakers.map(s => s.id === id ? { ...s, x, z } : s));
                        audioEngine.setSpatialPosition(x, 0, z);
                     }} onToggleSpeaker={() => {}} /></div>
                  </div>
               </div>
               
               <aside className="lg:col-span-4 space-y-8">
                  <div className="frost rounded-[2.5rem] p-8 border-white/5 bg-black/20">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6">Active Objects</h3>
                     <div className="space-y-3">
                        {speakers.filter(s => s.isActive).map(s => (
                          <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 transition-all group">
                             <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_blue]"></div>
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">{s.name}</span>
                             </div>
                             <span className="text-[8px] font-mono text-slate-500 group-hover:text-blue-400 transition-colors">X: {s.x.toFixed(1)} Z: {s.z.toFixed(1)}</span>
                          </div>
                        ))}
                     </div>
                  </div>
               </aside>
            </div>
          )}

          {/* VAULT: Presets and Signatures View */}
          {activeView === 'vault' && (
            <div className="max-w-6xl mx-auto space-y-16 animate-in fade-in duration-500">
               <header className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                  <div>
                    <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">The Studio <span className="text-blue-500">Vault</span></h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">Reference Signatures & Saved Identities</p>
                  </div>
                  <button onClick={savePreset} className="px-8 py-3 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                    New Signature
                  </button>
               </header>

               <section>
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 shrink-0">Factory Masters</h3>
                    <div className="h-px bg-white/5 flex-1"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {AUDIO_PRESETS.map(p => (
                      <button key={p} 
                              onClick={() => setSettings({ ...settings, selectedPreset: p })}
                              className={`text-left p-8 rounded-[2rem] border transition-all group relative overflow-hidden ${settings.selectedPreset === p ? 'bg-white text-black border-white shadow-2xl' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10 hover:border-white/10'}`}>
                         <h4 className="text-lg font-black italic tracking-tight uppercase mb-4">{p}</h4>
                         <div className="flex items-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <div className={`w-1 h-3 rounded-full ${settings.selectedPreset === p ? 'bg-black' : 'bg-blue-500'}`}></div>
                            <span className="text-[9px] font-black uppercase tracking-widest">Reference Profile Active</span>
                         </div>
                         <div className="absolute top-4 right-4 text-[7px] font-black uppercase opacity-20 tracking-widest">001-STG</div>
                      </button>
                    ))}
                  </div>
               </section>

               <section>
                  <div className="flex items-center gap-4 mb-8">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 shrink-0">Studio Identities</h3>
                    <div className="h-px bg-white/5 flex-1"></div>
                  </div>
                  {customPresets.length === 0 ? (
                    <div className="frost rounded-[2rem] py-20 text-center border-white/5 opacity-50">
                       <p className="text-[10px] font-black uppercase tracking-[0.4em]">No Custom Signatures Saved</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {customPresets.map(p => (
                        <div key={p.id} 
                             onClick={() => { setSettings(p.settings); setSpeakers(p.speakers); }}
                             className={`text-left p-8 rounded-[2rem] border cursor-pointer transition-all group relative overflow-hidden ${settings.selectedPreset === p.name ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20 shadow-2xl scale-[1.02]' : 'bg-blue-600/5 border-blue-500/10 text-blue-400 hover:bg-blue-600/10'}`}>
                           <h4 className="text-lg font-black italic tracking-tight uppercase mb-4 truncate pr-8">{p.name}</h4>
                           <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black uppercase tracking-widest bg-black/10 px-2 py-0.5 rounded">User Identity</span>
                           </div>
                           <button onClick={(e) => deletePreset(p.id, e)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
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

      {/* STUDIO RACK: Settings Overlay */}
      <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isSettingsOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-500 ${isSettingsOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsSettingsOpen(false)}></div>
        <div className={`absolute top-0 right-0 h-full w-full md:w-[450px] frost-dark border-l border-white/10 p-10 md:p-12 shadow-3xl transition-transform duration-500 ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
           <header className="flex justify-between items-center mb-12">
              <h2 className="text-2xl font-black italic tracking-tighter uppercase text-white">Studio <span className="text-blue-500">Rack</span></h2>
              <button onClick={() => setIsSettingsOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-slate-400">✕</button>
           </header>
           
           <div className="flex-1 overflow-y-auto pr-2 space-y-12 custom-scroll">
              <section className="space-y-8">
                 <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] flex items-center gap-3">
                   <div className="w-8 h-[1px] bg-blue-500/30"></div> Main Gain
                 </h3>
                 <ControlGroup label="System Gain" value={settings.volume} min={0} max={1} step={0.01} onChange={v => handleSliderChange('volume', v)} suffix="%" displayMult={100} />
                 <ControlGroup label="Bass Focus" value={settings.bass} min={-10} max={15} step={1} onChange={v => handleSliderChange('bass', v)} suffix="db" />
                 <ControlGroup label="Treble Air" value={settings.treble} min={-10} max={15} step={1} onChange={v => handleSliderChange('treble', v)} suffix="db" />
              </section>

              <section className="space-y-8">
                 <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] flex items-center gap-3">
                   <div className="w-8 h-[1px] bg-blue-500/30"></div> Processing
                 </h3>
                 <ControlGroup label="Vocal Clarity" value={settings.vocalClarity} min={0} max={15} step={1} onChange={v => handleSliderChange('vocalClarity', v)} suffix="db" />
                 <ControlGroup label="Height Virtualizer" value={settings.heightLevel} min={0} max={1} step={0.01} onChange={v => handleSliderChange('heightLevel', v)} suffix="%" displayMult={100} />
                 <ToggleSwitch label="Theater Saturation" enabled={settings.isTheaterMode} onToggle={() => handleSliderChange('isTheaterMode', !settings.isTheaterMode)} />
              </section>
           </div>
           
           <footer className="mt-12 pt-8 border-t border-white/5">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">Hardware Abstraction Layer v7.42.0</p>
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

  function handleSliderChange(key: keyof AudioSettings, val: any) {
    setSettings({ ...settings, [key]: val });
  }
};

const ControlGroup = ({ label, value, min, max, step, onChange, suffix, displayMult = 1 }: any) => (
  <div className="space-y-4 group">
    <div className="flex justify-between items-center px-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-400 transition-colors">{label}</label>
      <span className="text-[11px] font-mono text-blue-400 font-bold">{Math.round(value * displayMult)}{suffix}</span>
    </div>
    <div className="relative h-6 flex items-center">
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-blue-500" />
    </div>
  </div>
);

const ToggleSwitch = ({ label, enabled, onToggle }: any) => (
  <button onClick={onToggle} className="w-full flex items-center justify-between py-5 px-6 rounded-2xl bg-white/5 border border-white/5 active:bg-white/10 transition-all hover:border-white/10">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    <div className={`w-12 h-6 rounded-full relative transition-all duration-500 ${enabled ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-800'}`}>
      <div className={`absolute top-1 bottom-1 w-4 rounded-full bg-white transition-all duration-500 ${enabled ? 'left-7' : 'left-1'}`}></div>
    </div>
  </button>
);

export default App;
