
import React, { useState, useRef, useEffect } from 'react';
import { AudioSettings, SpeakerPosition, SpatialPreset } from './types';
import { AUDIO_PRESETS, SPEAKER_LAYOUTS } from './constants';
import { audioEngine } from './services/audioEngine';
import { Visualizer } from './components/Visualizer';
import { SpatialGrid } from './components/SpatialGrid';
import { ThreeDSpatialView } from './components/ThreeDSpatialView';
import { HeadTracker } from './components/HeadTracker';

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
      {/* Inner Glow Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-50"></div>
      
      {/* Infinity Symbol SVG */}
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
      
      {/* Edge Highlights */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"></div>
    </div>
  );
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<AudioSettings>({
    volume: 0.85,
    bass: 0,
    treble: 2,
    vocalClarity: 8,
    spatiality: 0.9,
    isAtmosEnabled: true,
    selectedPreset: 'Reference',
    isTheaterMode: true,
    isHeadTrackingEnabled: false,
    isDolbyVisionEnabled: true,
    surroundLevel: 0.75,
    heightLevel: 0.6,
    drc: 0.15,
    lfeCrossover: 80,
    centerSpread: 0.4,
  });

  const [speakers, setSpeakers] = useState<SpeakerPosition[]>(SPEAKER_LAYOUTS['Atmos 7.1.4']);
  const [isReady, setIsReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fileInfo, setFileInfo] = useState<{ name: string, size: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeLayout, setActiveLayout] = useState('Atmos 7.1.4');
  
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
      const sizeGB = (file.size / (1024 * 1024 * 1024)).toFixed(2);
      
      setTimeout(() => {
        setFileInfo({ name: file.name, size: `${sizeGB} GB` });
        if (mediaRef.current) {
          mediaRef.current.src = URL.createObjectURL(file);
          audioEngine.resume();
        }
        setIsLoading(false);
      }, 1200);
    }
  };

  const ejectFile = () => {
    if (mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.removeAttribute('src');
      mediaRef.current.load();
    }
    setFileInfo(null);
  };

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
      {/* Top Navigation */}
      <header className="flex justify-between items-center mb-6 px-4 animate-in slide-in-from-top duration-700">
        <div className="flex items-center gap-4 group cursor-default">
          <StagePOVLogo size="sm" />
          <div>
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">StagePOV</h1>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">Master 10GB Core v5.2</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {fileInfo && (
            <button 
              onClick={ejectFile}
              className="frost px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 border-red-500/20 transition-all flex items-center gap-2 group"
            >
              <svg className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
              Eject
            </button>
          )}
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`frost px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isSettingsOpen ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'hover:bg-white/10 text-slate-300'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isSettingsOpen ? 'bg-white' : 'bg-blue-500'} animate-pulse`}></span>
            Command Center
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left: Environment & Visuals */}
        <main className="col-span-8 flex flex-col gap-6 overflow-hidden animate-in fade-in duration-1000 delay-300">
          <div className="relative frost rounded-[3rem] overflow-hidden flex-1 bg-black/40 group shadow-2xl">
             <video 
                ref={mediaRef} 
                className={`w-full h-full object-contain ${settings.isDolbyVisionEnabled ? 'dolby-vision-active' : ''} transition-all duration-700`}
                controls 
              />
              
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-3xl z-30">
                  <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Ingesting Stream...</span>
                </div>
              )}

              {!fileInfo && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-500">
                   <label className="frost p-12 rounded-[3rem] border-white/5 cursor-pointer hover:bg-white/5 hover:border-blue-500/20 transition-all flex flex-col items-center group relative overflow-hidden">
                      <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 relative z-10">
                        <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] relative z-10 text-white">Load Master Media</span>
                      <p className="text-[8px] text-slate-500 mt-2 relative z-10">MKV • MP4 • FLAC • 10GB MAX</p>
                      <input type="file" className="hidden" accept="video/*,audio/*" onChange={handleFileUpload} />
                   </label>
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
                    <div className="flex gap-1">
                      <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                      <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse delay-75"></div>
                    </div>
                  </div>
                  <Visualizer />
                </div>
                <div className="text-center bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[7px] font-black uppercase text-slate-500 tracking-widest">Signal Resolution</p>
                  <p className="text-[10px] font-mono text-blue-400 mt-1 font-bold">24-BIT / 192KHZ PRO</p>
                </div>
             </div>
          </div>
        </main>

        {/* Right: Object Field & Presets */}
        <aside className="col-span-4 flex flex-col gap-6 overflow-hidden animate-in slide-in-from-right duration-700 delay-300">
           <section className="frost rounded-[2.5rem] p-8 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Object Field</h2>
                <button 
                  onClick={resetLayout} 
                  className="text-[8px] font-black text-slate-500 hover:text-white uppercase transition-colors flex items-center gap-1 group"
                >
                  <span className="group-hover:rotate-[-45deg] transition-transform duration-300">↺</span> Reset
                </button>
              </div>
              <SpatialGrid speakers={speakers} onSpeakerMove={(id, x, z) => {
                setSpeakers(prev => prev.map(s => s.id === id ? { ...s, x, z } : s));
                audioEngine.setSpatialPosition(x, 0, z);
              }} onToggleSpeaker={() => {}} />
           </section>

           <section className="frost rounded-[2.5rem] p-8 flex-1 overflow-y-auto custom-scroll">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6">Sonic Signature</h2>
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
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-4">Spatial Map</h2>
                <div className="space-y-2">
                   {Object.keys(SPEAKER_LAYOUTS).map(layout => (
                     <button 
                      key={layout}
                      onClick={() => { setSpeakers(SPEAKER_LAYOUTS[layout]); setActiveLayout(layout); }}
                      className={`w-full px-5 py-3 rounded-xl text-[8px] font-black uppercase border transition-all text-left flex justify-between items-center transform active:scale-[0.98] ${activeLayout === layout ? 'bg-blue-600/20 border-blue-500/30 text-white shadow-xl shadow-blue-900/10' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
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

      {/* Settings Panel (Command Center Overlay) */}
      <div 
        className={`fixed inset-0 z-50 transition-all duration-700 ease-in-out ${isSettingsOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'}`}
      >
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-700 ${isSettingsOpen ? 'opacity-100' : 'opacity-0'}`} 
          onClick={() => setIsSettingsOpen(false)}
        ></div>
        <div 
          className={`absolute top-0 right-0 w-[420px] h-full frost-dark p-10 border-l border-white/10 shadow-3xl transition-transform duration-700 ease-out flex flex-col ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex justify-between items-center mb-12 animate-in fade-in slide-in-from-right duration-500">
            <h2 className="text-xl font-black italic tracking-tighter uppercase text-white">Command <span className="text-blue-500">Center</span></h2>
            <button 
              onClick={() => setIsSettingsOpen(false)} 
              className="w-10 h-10 flex items-center justify-center rounded-full frost hover:bg-white/10 transition-all text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 space-y-12 custom-scroll animate-in fade-in slide-in-from-bottom duration-1000">
            {/* Master Rack */}
            <section className="space-y-6">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="w-4 h-[1px] bg-blue-500/30"></span> Master Rack
              </h3>
              <ControlGroup label="System Gain" value={settings.volume} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('volume', v)} suffix="%" displayMult={100} />
              <ControlGroup label="Dialogue Focus" value={settings.vocalClarity} min={0} max={15} step={1} onChange={(v) => handleSliderChange('vocalClarity', v)} suffix="db" />
              <ControlGroup label="LFE Sub Bass" value={settings.bass} min={-10} max={15} step={1} onChange={(v) => handleSliderChange('bass', v)} suffix="db" />
            </section>

            {/* Object Mixing */}
            <section className="space-y-6">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="w-4 h-[1px] bg-blue-500/30"></span> Object Mixing
              </h3>
              <ControlGroup label="Surround Gain" value={settings.surroundLevel} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('surroundLevel', v)} suffix="%" displayMult={100} />
              <ControlGroup label="Height Intensity" value={settings.heightLevel} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('heightLevel', v)} suffix="%" displayMult={100} />
              <ControlGroup label="Spatial Depth" value={settings.spatiality} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('spatiality', v)} suffix="%" displayMult={100} />
            </section>

            {/* Processing Core */}
            <section className="space-y-6">
              <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="w-4 h-[1px] bg-blue-500/30"></span> Processing Core
              </h3>
              <ControlGroup label="Dynamic Comp (DRC)" value={settings.drc} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('drc', v)} suffix="%" displayMult={100} />
              <ControlGroup label="Bass Crossover" value={settings.lfeCrossover} min={40} max={120} step={1} onChange={(v) => handleSliderChange('lfeCrossover', v)} suffix="Hz" />
              <div className="pt-4 space-y-4">
                 <ToggleSwitch label="Dolby Vision HDR" enabled={settings.isDolbyVisionEnabled} onToggle={() => handleSliderChange('isDolbyVisionEnabled', !settings.isDolbyVisionEnabled)} />
                 <ToggleSwitch label="Virtual Theater" enabled={settings.isTheaterMode} onToggle={() => handleSliderChange('isTheaterMode', !settings.isTheaterMode)} />
                 <ToggleSwitch label="Head Tracking" enabled={settings.isHeadTrackingEnabled} onToggle={() => handleSliderChange('isHeadTrackingEnabled', !settings.isHeadTrackingEnabled)} />
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 text-center animate-in fade-in duration-1000">
             <p className="text-[7px] font-black text-slate-600 uppercase tracking-[0.5em]">Optimized for StagePOV Spatial</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ControlGroup = ({ label, value, min, max, step, onChange, suffix, displayMult = 1 }: any) => (
  <div className="space-y-3 group">
    <div className="flex justify-between items-center px-1 transition-colors">
      <label className="text-[8px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300">{label}</label>
      <span className="text-[10px] font-mono text-blue-400 font-bold group-hover:scale-110 transition-transform">{Math.round(value * displayMult)}{suffix}</span>
    </div>
    <div className="relative h-6 flex items-center">
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value))} 
        className="w-full relative z-10" 
      />
    </div>
  </div>
);

const ToggleSwitch = ({ label, enabled, onToggle }: any) => (
  <button 
    onClick={onToggle} 
    className="w-full flex items-center justify-between py-3 px-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group text-left transform active:scale-95"
  >
    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
    <div className={`w-10 h-5 rounded-full relative transition-all duration-500 ${enabled ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-800'}`}>
      <div className={`absolute top-1 bottom-1 w-3 rounded-full bg-white transition-all duration-500 shadow-md ${enabled ? 'left-6' : 'left-1'}`}></div>
    </div>
  </button>
);

export default App;
