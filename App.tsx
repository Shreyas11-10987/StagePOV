
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

const BIT_DEPTH_OPTIONS = [16, 24, 32] as const;
const SAMPLE_RATE_MAP: Record<number, number[]> = {
  16: [44100, 48000],
  24: [48000, 88200, 96000],
  32: [96000, 192000]
};

const HighResBadge = ({ bit, freq }: { bit: number, freq: number }) => (
  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 backdrop-blur-md">
    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
      {bit}-bit / {freq >= 1000 ? (freq / 1000).toFixed(1) : freq} kHz Signal Path
    </span>
  </div>
);

const App: React.FC = () => {
  const [settings, setSettings] = useState<AudioSettings>({
    volume: 0.85, bass: 0, treble: 2, vocalClarity: 8, spatiality: 0.9,
    isAtmosEnabled: true, selectedPreset: 'Pure Direct', isTheaterMode: false,
    isHeadTrackingEnabled: false, isDolbyVisionEnabled: false, surroundLevel: 0.75,
    heightLevel: 0.6, drc: 0.1, lfeCrossover: 80, centerSpread: 0.4,
    bitDepth: 32, sampleRate: 192000
  });

  const [speakers, setSpeakers] = useState<SpeakerPosition[]>(SPEAKER_LAYOUTS['Atmos Music 7.1.4']);
  const [activeLayout, setActiveLayout] = useState('Atmos Music 7.1.4');
  const [activeView, setActiveView] = useState<'deck' | 'stage' | 'vault'>('deck');
  const [isReady, setIsReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fileData, setFileData] = useState<{ name: string, url: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => {
    const saved = localStorage.getItem('stagepov_pro_vault_v5');
    return saved ? JSON.parse(saved) : [];
  });
  
  const mediaRef = useRef<HTMLAudioElement>(null);

  // Re-initialize engine when sample rate or bit depth changes
  // We use a "key" on the audio element to force a complete reset to avoid the 'MediaElementSource' error
  useEffect(() => {
    if (mediaRef.current && isReady) {
      audioEngine.init(mediaRef.current, settings.sampleRate, settings.bitDepth).then(() => {
        updateEngine();
        if (isPlaying) mediaRef.current?.play();
      });
    }
  }, [isReady, settings.sampleRate, settings.bitDepth, fileData?.url]);

  const updateEngine = () => {
    if (!audioEngine.isActive()) return;
    audioEngine.setVolume(settings.volume);
    audioEngine.setBass(settings.bass);
    audioEngine.setTreble(settings.treble);
    audioEngine.setVocalClarity(settings.vocalClarity);
    audioEngine.setTheaterMode(settings.isTheaterMode);
    audioEngine.setDRC(settings.drc);
    audioEngine.setHeightLevel(settings.heightLevel);
    
    // Update spatial positions for all active speakers
    speakers.filter(s => s.isActive).forEach(s => {
      audioEngine.setSpatialPosition(s.x, s.y, s.z);
    });
  };

  useEffect(() => { updateEngine(); }, [settings.volume, settings.bass, settings.treble, settings.vocalClarity, settings.isTheaterMode, settings.drc, settings.heightLevel, speakers]);
  useEffect(() => { localStorage.setItem('stagepov_pro_vault_v5', JSON.stringify(customPresets)); }, [customPresets]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (fileData?.url) URL.revokeObjectURL(fileData.url);
      setFileData({ 
        name: file.name.replace(/\.[^/.]+$/, ""), 
        url: URL.createObjectURL(file)
      });
      setIsPlaying(false);
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
    const name = prompt("Commit signature as:");
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

  const NavItem = ({ id, label, icon }: { id: typeof activeView, label: string, icon: React.ReactNode }) => (
    <button 
      onClick={() => setActiveView(id)}
      className={`flex flex-col md:flex-row items-center gap-3 md:gap-4 px-6 py-4 rounded-2xl transition-all duration-500 ${activeView === id ? 'text-white bg-blue-600/30 border border-blue-500/40 shadow-xl' : 'text-slate-500 hover:bg-white/5'}`}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );

  if (!isReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#020205] z-[300]">
        <div className="text-center space-y-12 animate-in zoom-in duration-1000">
          <div className="w-24 h-24 frost flex items-center justify-center rounded-3xl border-white/10 mx-auto shadow-2xl">
            <svg className="w-12 h-12 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="space-y-3">
            <h1 className="text-5xl font-black italic text-white tracking-tighter">Stage<span className="text-blue-500">POV</span></h1>
            <HighResBadge bit={32} freq={192000} />
          </div>
          <button onClick={() => setIsReady(true)} className="px-12 py-5 bg-white text-black font-black uppercase text-[11px] tracking-widest rounded-full hover:scale-110 active:scale-95 transition-all shadow-2xl">Initialize Master Suite</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[#020205] text-white overflow-hidden font-inter">
      
      {/* PERSISTENT AUDIO ELEMENT - Keyed by sampleRate/bitDepth to force recreation and prevent 'MediaElementSource' reuse error */}
      <audio 
        key={`${settings.sampleRate}-${settings.bitDepth}-${fileData?.url}`}
        ref={mediaRef} 
        src={fileData?.url}
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
        onTimeUpdate={() => setCurrentTime(mediaRef.current?.currentTime || 0)} 
        onLoadedMetadata={() => setDuration(mediaRef.current?.duration || 0)} 
      />

      {/* Sidebar */}
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 p-6 md:p-10 flex md:flex-col justify-between shrink-0 bg-black/40 backdrop-blur-3xl z-50">
        <div className="flex md:flex-col gap-10 items-center md:items-stretch w-full">
          <div className="hidden md:flex items-center gap-5">
            <div className="w-10 h-10 frost flex items-center justify-center rounded-xl border-white/10">
               <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="flex flex-col">
              <span className="font-black italic text-lg tracking-tighter uppercase leading-none">Stage<span className="text-blue-500">POV</span></span>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Master V5.0</span>
            </div>
          </div>
          <nav className="flex md:flex-col gap-3 flex-1 justify-around md:justify-start w-full">
            <NavItem id="deck" label="The Deck" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
            <NavItem id="stage" label="The Stage" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>} />
            <NavItem id="vault" label="The Vault" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>} />
          </nav>
        </div>
        
        <button onClick={() => setIsSettingsOpen(true)} className="hidden md:flex items-center justify-between w-full px-6 py-5 rounded-3xl bg-blue-600/5 hover:bg-blue-600/10 border border-blue-500/10 transition-all group">
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">DSP MASTER RACK</span>
          </div>
          <svg className="w-4 h-4 text-slate-600 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
        </button>

        <button onClick={() => setIsSettingsOpen(true)} className="md:hidden w-14 h-14 flex items-center justify-center rounded-2xl frost border-white/20">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
        </button>
      </aside>

      {/* Main Console */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#020205] relative overflow-hidden">
        <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-16 pb-32 md:pb-16 h-full flex flex-col">
          
          {activeView === 'deck' && (
            <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full animate-in fade-in duration-700">
              <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                {!fileData ? (
                  <label className="frost w-full max-w-md aspect-square rounded-[4rem] border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all group p-12 text-center">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-blue-500/10 flex items-center justify-center mb-10 group-hover:scale-110 transition-transform">
                      <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    </div>
                    <span className="text-base font-black uppercase tracking-[0.4em] text-white">Ingest Master Audio</span>
                    <input type="file" className="hidden" accept="audio/*" onChange={handleFileUpload} />
                  </label>
                ) : (
                  <div className="w-full flex flex-col items-center text-center">
                    <div className="relative w-72 h-72 md:w-[480px] md:h-[480px] mb-20">
                       <div className="absolute inset-0 rounded-full bg-blue-600/5 backdrop-blur-[100px] border border-white/10 shadow-3xl overflow-hidden flex items-center justify-center">
                          <Visualizer />
                       </div>
                    </div>
                    <div className="space-y-6">
                      <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter text-white uppercase truncate px-4">{fileData.name}</h2>
                      <div className="flex flex-wrap gap-4 justify-center">
                         <HighResBadge bit={settings.bitDepth} freq={settings.sampleRate} />
                         <span className="px-5 py-2 rounded-full bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-white/10">Binaural Render Ready</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {fileData && (
                <div className="w-full max-w-4xl mx-auto frost p-8 md:p-12 rounded-[3.5rem] border-white/10 bg-black/60 mt-12 mb-10 shadow-2xl">
                   <div className="flex flex-col md:flex-row items-center gap-12">
                      <div className="flex items-center gap-8 shrink-0">
                        <button onClick={() => { if(mediaRef.current) mediaRef.current.currentTime -= 10 }} className="text-slate-600 hover:text-white transition-colors">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6L11 18zM11.5 12l8.5 6V6l-8.5 6z"/></svg>
                        </button>
                        <button onClick={togglePlay} className="w-24 h-24 rounded-[2.5rem] bg-white text-black flex items-center justify-center hover:scale-110 active:scale-90 transition-all shadow-2xl">
                          {isPlaying ? <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                        </button>
                        <button onClick={() => { if(mediaRef.current) mediaRef.current.currentTime += 10 }} className="text-slate-600 hover:text-white transition-colors">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>
                        </button>
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-6 w-full">
                         <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden relative group/seek cursor-pointer" 
                              onClick={(e) => {
                                if(mediaRef.current && duration) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const pos = (e.clientX - rect.left) / rect.width;
                                  mediaRef.current.currentTime = pos * duration;
                                }
                              }}>
                            <div className="h-full bg-blue-600 transition-all duration-300 relative rounded-full" style={{ width: `${(currentTime/duration)*100}%` }}>
                               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full scale-0 group-hover/seek:scale-100 transition-transform shadow-2xl"></div>
                            </div>
                         </div>
                         <div className="flex justify-between text-xs font-mono font-black text-slate-500">
                            <span className="text-blue-500">{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                         </div>
                      </div>
                   </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'vault' && (
            <div className="max-w-7xl mx-auto space-y-24 w-full animate-in fade-in duration-700">
               <header className="flex flex-col md:flex-row justify-between items-end md:items-center gap-10 border-b border-white/5 pb-16">
                  <div className="space-y-3">
                    <h2 className="text-5xl font-black italic tracking-tighter uppercase">Studio <span className="text-blue-500">Vault</span></h2>
                    <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.5em]">SYSTEM SIGNATURES & USER MASTERS</p>
                  </div>
                  <button onClick={saveToVault} className="px-12 py-5 bg-blue-600 text-white font-black uppercase text-[12px] tracking-widest rounded-2xl hover:scale-105 transition-all shadow-2xl flex items-center gap-5 group">
                    <svg className="w-5 h-5 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 4v16m8-8H4"/></svg>
                    Commit New Identity
                  </button>
               </header>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                 {AUDIO_PRESETS.map(p => (
                   <button key={p} 
                           onClick={() => setSettings(prev => ({ ...prev, selectedPreset: p }))}
                           className={`text-left p-12 rounded-[3.5rem] border transition-all group relative overflow-hidden ${settings.selectedPreset === p ? 'bg-white text-black border-white shadow-2xl scale-[1.04]' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'}`}>
                      <h4 className="text-2xl font-black italic tracking-tight uppercase mb-8">{p}</h4>
                      <div className="flex items-center gap-4">
                         <div className={`w-2 h-2 rounded-full ${settings.selectedPreset === p ? 'bg-black animate-pulse' : 'bg-blue-500'}`}></div>
                         <span className="text-[10px] font-black uppercase tracking-[0.3em]">{settings.selectedPreset === p ? 'ACTIVE' : 'REFERENCE'}</span>
                      </div>
                   </button>
                 ))}
                 {customPresets.map(p => (
                   <div key={p.id} 
                        onClick={() => { setSettings(p.settings); setSpeakers(p.speakers); }}
                        className={`text-left p-12 rounded-[4rem] border cursor-pointer transition-all group relative overflow-hidden ${settings.selectedPreset === p.name ? 'bg-blue-600 text-white border-blue-400 shadow-2xl scale-[1.04]' : 'bg-blue-600/5 border-blue-500/10 text-blue-400'}`}>
                      <h4 className="text-2xl font-black italic tracking-tight uppercase mb-8 truncate pr-10">{p.name}</h4>
                      <button onClick={(e) => { e.stopPropagation(); setCustomPresets(prev => prev.filter(pr => pr.id !== p.id)); }} className="absolute top-10 right-10 w-10 h-10 flex items-center justify-center rounded-xl bg-black/10 text-white/40 opacity-0 group-hover:opacity-100 transition-all">
                         <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                      </button>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeView === 'stage' && (
            <div className="h-full flex flex-col gap-10 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
               <div className="flex-1 frost rounded-[4rem] p-8 relative border-white/10 overflow-hidden min-h-[450px] shadow-3xl bg-black/40">
                  <ThreeDSpatialView speakers={speakers} listenerPos={{x:0, y:0}} headRotation={0} isTheaterMode={settings.isTheaterMode} />
               </div>
               <div className="frost rounded-[3.5rem] p-12 bg-black/60 border-white/10 shadow-2xl mb-10">
                  <div className="flex flex-col md:flex-row justify-between gap-10 mb-12">
                    <div className="space-y-2">
                      <h3 className="text-[13px] font-black uppercase tracking-[0.5em] text-blue-500">Spatial Topology</h3>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em]">RE-ORDER SOUND OBJECTS IN REALTIME</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                       {Object.keys(SPEAKER_LAYOUTS).map(l => (
                         <button key={l} onClick={() => { setSpeakers(SPEAKER_LAYOUTS[l]); setActiveLayout(l); }} 
                                 className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeLayout === l ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}>
                           {l}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div className="h-80"><SpatialGrid speakers={speakers} onSpeakerMove={(id, x, z) => {
                    setSpeakers(prev => prev.map(s => s.id === id ? { ...s, x, z } : s));
                  }} onToggleSpeaker={() => {}} /></div>
               </div>
            </div>
          )}

        </div>
      </main>

      {/* DSP RACK OVERLAY */}
      <div className={`fixed inset-0 z-[200] transition-all duration-700 ${isSettingsOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-black/95 backdrop-blur-3xl transition-opacity duration-700 ${isSettingsOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsSettingsOpen(false)}></div>
        <div className={`absolute top-0 right-0 h-full w-full md:w-[600px] frost-dark border-l border-white/10 p-12 md:p-20 shadow-3xl transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
           <header className="flex justify-between items-center mb-16 shrink-0">
              <div className="space-y-2">
                <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">Studio <span className="text-blue-500">Rack</span></h2>
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-mono">DSP_MASTER_CORE_ONLINE</span>
                </div>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all text-slate-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
           </header>
           
           <div className="flex-1 overflow-y-auto pr-8 space-y-16 custom-scroll min-h-0">
              
              <section className="space-y-10">
                 <div className="flex items-center gap-6">
                   <h3 className="text-[12px] font-black text-blue-500 uppercase tracking-[0.5em] shrink-0">Engine Clock & Depth</h3>
                   <div className="h-px bg-blue-500/10 flex-1"></div>
                 </div>
                 
                 <div className="space-y-10">
                   <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bit Depth Architecture</label>
                     <div className="grid grid-cols-3 gap-3">
                       {BIT_DEPTH_OPTIONS.map(bit => (
                         <button key={bit} 
                                 onClick={() => {
                                   const availableFreqs = SAMPLE_RATE_MAP[bit];
                                   setSettings(prev => ({ ...prev, bitDepth: bit, sampleRate: availableFreqs[availableFreqs.length - 1] }));
                                 }}
                                 className={`py-5 rounded-2xl border font-black text-sm transition-all ${settings.bitDepth === bit ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                           {bit}-BIT
                         </button>
                       ))}
                     </div>
                   </div>

                   <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Master Sample Rate (kHz)</label>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                       {SAMPLE_RATE_MAP[settings.bitDepth].map(freq => (
                         <button key={freq} 
                                 onClick={() => setSettings(prev => ({ ...prev, sampleRate: freq }))}
                                 className={`py-5 rounded-2xl border font-black text-xs transition-all ${settings.sampleRate === freq ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                           {freq >= 1000 ? (freq / 1000).toFixed(1) : freq} kHz
                         </button>
                       ))}
                     </div>
                   </div>
                 </div>
              </section>

              <section className="space-y-12 pb-20">
                 <div className="flex items-center gap-6">
                   <h3 className="text-[12px] font-black text-blue-500 uppercase tracking-[0.5em] shrink-0">Processing Chain</h3>
                   <div className="h-px bg-blue-500/10 flex-1"></div>
                 </div>
                 <ControlGroup label="System Gain" value={settings.volume} min={0} max={1} step={0.01} onChange={v => setSettings(p => ({...p, volume: v}))} suffix="%" displayMult={100} />
                 <ControlGroup label="Low-End Focus" value={settings.bass} min={-10} max={15} step={1} onChange={v => setSettings(p => ({...p, bass: v}))} suffix="db" />
                 <ControlGroup label="Vocal Presence" value={settings.vocalClarity} min={0} max={15} step={1} onChange={v => setSettings(p => ({...p, vocalClarity: v}))} suffix="db" />
                 <ToggleSwitch label="Theater Saturation" enabled={settings.isTheaterMode} onToggle={() => setSettings(p => ({...p, isTheaterMode: !p.isTheaterMode}))} />
              </section>
           </div>
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
  <div className="space-y-6 group">
    <div className="flex justify-between items-center">
      <label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-600 group-hover:text-white transition-colors">{label}</label>
      <div className="px-4 py-1.5 rounded-xl bg-blue-600/10 border border-blue-500/20">
        <span className="text-[13px] font-mono text-blue-400 font-black">{Math.round(value * displayMult)}{suffix}</span>
      </div>
    </div>
    <div className="relative h-6 flex items-center">
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-blue-500 bg-white/5 h-[8px] rounded-full appearance-none cursor-pointer" />
    </div>
  </div>
);

const ToggleSwitch = ({ label, enabled, onToggle }: any) => (
  <button onClick={onToggle} className="w-full flex items-center justify-between py-7 px-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-white/20 transition-all group active:scale-[0.98]">
    <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">{label}</span>
    <div className={`w-16 h-8 rounded-full relative transition-all duration-700 ${enabled ? 'bg-blue-600 shadow-xl' : 'bg-slate-800'}`}>
      <div className={`absolute top-1.5 bottom-1.5 w-5 rounded-full bg-white transition-all duration-500 shadow-2xl ${enabled ? 'left-9' : 'left-2'}`}></div>
    </div>
  </button>
);

export default App;
