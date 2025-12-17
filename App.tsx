
import React, { useState, useRef, useEffect } from 'react';
import { AudioSettings, SpeakerPosition, SpatialPreset } from './types';
import { AUDIO_PRESETS, SPEAKER_LAYOUTS } from './constants';
import { audioEngine } from './services/audioEngine';
import { Visualizer } from './components/Visualizer';
import { SpatialGrid } from './components/SpatialGrid';
import { ThreeDSpatialView } from './components/ThreeDSpatialView';
import { HeadTracker } from './components/HeadTracker';

const App: React.FC = () => {
  const [settings, setSettings] = useState<AudioSettings>({
    volume: 0.85,
    bass: 4,
    treble: 2,
    vocalClarity: 6,
    spatiality: 0.8,
    isAtmosEnabled: true,
    selectedPreset: 'Reference',
    isTheaterMode: true,
    isHeadTrackingEnabled: false,
    isDolbyVisionEnabled: true,
  });

  const [speakers, setSpeakers] = useState<SpeakerPosition[]>(SPEAKER_LAYOUTS['Atmos 7.1.4']);
  const [spatialPresets, setSpatialPresets] = useState<SpatialPreset[]>(() => {
    const saved = localStorage.getItem('atmos_spatial_configs');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Studio Reference', speakers: SPEAKER_LAYOUTS['Atmos 7.1.4'], listenerPos: { x: 0, y: 0 } },
      { id: '2', name: 'Classic 5.1', speakers: SPEAKER_LAYOUTS['Surround 5.1'], listenerPos: { x: 0, y: 0 } }
    ];
  });

  const [headRotation, setHeadRotation] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
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
  };

  useEffect(() => {
    if (isReady) updateEngine();
  }, [settings]);

  const handleSliderChange = (key: keyof AudioSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSpeakerMove = (id: string, x: number, z: number) => {
    setSpeakers(prev => prev.map(s => s.id === id ? { ...s, x, z } : s));
    audioEngine.setSpatialPosition(x, 0, z);
  };

  const handleToggleSpeaker = (id: string) => {
    setSpeakers(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const applyLayout = (layoutName: string) => {
    setSpeakers(SPEAKER_LAYOUTS[layoutName]);
    setActiveLayout(layoutName);
  };

  const resetLayout = () => {
    // Restores positions based on the current layout name constant
    if (SPEAKER_LAYOUTS[activeLayout]) {
      setSpeakers(SPEAKER_LAYOUTS[activeLayout]);
      // Reset engine focus to center
      audioEngine.setSpatialPosition(0, 0, 0);
    }
  };

  const saveCurrentSpatialConfig = () => {
    const name = prompt("Enter a name for this speaker layout:");
    if (!name) return;
    const newPreset: SpatialPreset = {
      id: Date.now().toString(),
      name,
      speakers: [...speakers],
      listenerPos: { x: 0, y: 0 }
    };
    const updated = [...spatialPresets, newPreset];
    setSpatialPresets(updated);
    localStorage.setItem('atmos_spatial_configs', JSON.stringify(updated));
  };

  const loadSpatialPreset = (preset: SpatialPreset) => {
    setSpeakers(preset.speakers);
    setActiveLayout(preset.name);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && mediaRef.current) {
      // 10GB Support: 10 * 1024 * 1024 * 1024 bytes
      const limit = 10 * 1024 * 1024 * 1024;
      if (file.size > limit) {
        alert("Warning: File exceeds the 10GB Cinema limit. High bitrate playback may be unstable.");
      }
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      mediaRef.current.src = url;
      audioEngine.resume();
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#020205]">
        <div className="relative mb-12 animate-pulse">
           <div className="absolute -inset-4 bg-blue-600 rounded-[3rem] blur-2xl opacity-20"></div>
           <div className="relative w-32 h-32 bg-[#0a0a0c] rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl">
              <span className="text-6xl font-black italic tracking-tighter text-blue-500">A</span>
           </div>
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-tighter uppercase italic text-white">AtmosSphere <span className="text-blue-600">Pro</span></h1>
        <p className="text-slate-500 text-[10px] font-black tracking-[0.4em] uppercase mb-12 text-center">Reference Cinema Audio Processor</p>
        <button 
          onClick={() => setIsReady(true)}
          className="px-16 py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-full hover:bg-blue-50 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
        >
          Initialize Studio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020205] text-slate-200 p-4 lg:p-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Sidebar: Audio Parameters */}
        <aside className="lg:col-span-3 space-y-6">
          <header className="flex items-center gap-4 mb-10">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <span className="text-lg font-black italic text-white">A</span>
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-widest text-white">AtmosSphere</h1>
              <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">v5.0 Ultra-Large File Core</p>
            </div>
          </header>

          <section className="glass rounded-[2rem] p-6 space-y-8 border-white/5 shadow-2xl">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-[9px] font-black uppercase tracking-widest text-blue-500">Processing Engine</h2>
              <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              </div>
            </div>

            <ControlGroup label="Master Volume" value={settings.volume} min={0} max={1} step={0.01} onChange={(v) => handleSliderChange('volume', v)} suffix="%" displayMult={100} />
            <ControlGroup label="Vocal Definition" value={settings.vocalClarity} min={0} max={12} step={1} onChange={(v) => handleSliderChange('vocalClarity', v)} suffix="db" />
            <ControlGroup label="LFE Sub Bass" value={settings.bass} min={-10} max={15} step={1} onChange={(v) => handleSliderChange('bass', v)} suffix="db" />
            <ControlGroup label="Spatial Resolution" value={settings.spatiality} min={0} max={1} step={0.05} onChange={(v) => handleSliderChange('spatiality', v)} suffix="%" displayMult={100} />

            <div className="pt-4 border-t border-white/5 space-y-3">
              <ToggleSwitch 
                label="Dolby Vision Enhance" 
                enabled={settings.isDolbyVisionEnabled} 
                onToggle={() => handleSliderChange('isDolbyVisionEnabled', !settings.isDolbyVisionEnabled)} 
              />
              <ToggleSwitch 
                label="Theater Simulation" 
                enabled={settings.isTheaterMode} 
                onToggle={() => handleSliderChange('isTheaterMode', !settings.isTheaterMode)} 
              />
            </div>
          </section>

          <section className="glass rounded-[2rem] p-6 border-white/5">
             <h2 className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-6">Acoustic Visualization</h2>
             <Visualizer />
          </section>
        </aside>

        {/* Main Content: Video & 3D Environment */}
        <main className="lg:col-span-6 space-y-10">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-[2.5rem] blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative glass rounded-[2.5rem] overflow-hidden aspect-video bg-black border-white/10 shadow-2xl">
               <video 
                ref={mediaRef} 
                className={`w-full h-full object-contain ${settings.isDolbyVisionEnabled ? 'dolby-vision-active' : 'transition-all duration-700'}`}
                controls 
              />
              {!fileName && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-black/80 backdrop-blur-3xl text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                  </div>
                  <h3 className="text-xl font-black italic uppercase text-white mb-2">Import High-Bitrate Source</h3>
                  <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.2em] mb-8">MKV • MP4 • MOV • 10GB MAX</p>
                  <label className="px-10 py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-[9px] rounded-full hover:bg-blue-500 transition-all cursor-pointer shadow-lg shadow-blue-600/20">
                    Select Cinema File
                    <input type="file" className="hidden" accept="video/mp4,video/x-matroska,video/quicktime,video/webm,video/*" onChange={handleFileUpload} />
                  </label>
                </div>
              )}
              {fileName && (
                 <div className="absolute top-6 left-6 flex gap-2 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[8px] font-black tracking-widest uppercase text-slate-300">RAW BITSTREAM</div>
                    {settings.isDolbyVisionEnabled && (
                      <div className="bg-blue-600 px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase text-white shadow-lg">Vision HDR</div>
                    )}
                 </div>
              )}
            </div>
          </div>

          <ThreeDSpatialView speakers={speakers} listenerPos={{x:0, y:0}} headRotation={headRotation} isTheaterMode={settings.isTheaterMode} />

          <div className="flex items-center justify-between px-4">
             <div className="flex gap-6 text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">
                <span>Core: Studio Reference</span>
                <span>Buffer: Adaptive 10GB</span>
             </div>
             <HeadTracker enabled={settings.isHeadTrackingEnabled} onRotate={setHeadRotation} />
          </div>
        </main>

        {/* Right Sidebar: Spatial Presets & Speaker Field */}
        <aside className="lg:col-span-3 space-y-8">
           <section className="glass rounded-[2rem] p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[9px] font-black uppercase tracking-widest text-blue-500">Spatial Presets</h2>
                <button onClick={saveCurrentSpatialConfig} className="text-[14px] text-slate-500 hover:text-white transition-colors" title="Save Current Layout">+</button>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scroll">
                 {spatialPresets.map(preset => (
                   <button 
                    key={preset.id}
                    onClick={() => loadSpatialPreset(preset)}
                    className="group flex flex-col p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left"
                   >
                     <span className="text-[9px] font-black uppercase text-slate-300 group-hover:text-white">{preset.name}</span>
                     <span className="text-[7px] text-slate-600 font-mono">{preset.speakers.length} Active Objects</span>
                   </button>
                 ))}
              </div>
              <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-2">
                 {['Stereo 2.0', 'Surround 5.1', 'Surround 7.1', 'Atmos 7.1.4'].map(layout => (
                   <button 
                    key={layout}
                    onClick={() => applyLayout(layout)}
                    className={`px-3 py-2 rounded-lg text-[7px] font-black uppercase border transition-all ${activeLayout === layout ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                   >
                     {layout}
                   </button>
                 ))}
              </div>
           </section>

           <section className="glass rounded-[2rem] p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[9px] font-black uppercase tracking-widest text-blue-500">Object Field</h2>
                <button 
                  onClick={resetLayout}
                  className="text-[8px] font-black text-slate-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1 group"
                >
                  <span className="group-hover:rotate-[-45deg] transition-transform">↺</span> Reset
                </button>
              </div>
              <SpatialGrid speakers={speakers} onSpeakerMove={handleSpeakerMove} onToggleSpeaker={handleToggleSpeaker} />
              <div className="mt-6 space-y-2">
                <p className="text-[7px] text-center text-slate-600 font-black uppercase tracking-widest">Dynamic Object Mapping</p>
                <div className="h-0.5 w-12 bg-blue-600/30 mx-auto rounded-full"></div>
              </div>
           </section>

           <section className="glass rounded-[2rem] p-6 space-y-4">
              <h2 className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-2">Sonic Signatures</h2>
              <div className="grid grid-cols-2 gap-2">
                 {AUDIO_PRESETS.map(p => (
                   <button 
                    key={p}
                    onClick={() => handleSliderChange('selectedPreset', p)}
                    className={`px-2 py-3 rounded-xl text-[7px] font-black uppercase tracking-widest border transition-all ${settings.selectedPreset === p ? 'bg-white text-black' : 'bg-white/5 border-white/5 text-slate-600'}`}
                   >
                     {p}
                   </button>
                 ))}
              </div>
           </section>
        </aside>

      </div>
      
      <footer className="mt-16 text-center">
         <div className="inline-flex items-center gap-8 py-3 px-10 rounded-full border border-white/5 bg-white/5 text-[8px] font-black uppercase tracking-[0.4em] text-slate-600">
            <span>ATMOS_SPHERE_PRO</span>
            <div className="w-1 h-1 rounded-full bg-slate-800"></div>
            <span>MASTER_FILE_SUPPORT: 10GB</span>
            <div className="w-1 h-1 rounded-full bg-slate-800"></div>
            <span>NETLIFY_DEPLOYED</span>
         </div>
      </footer>
    </div>
  );
};

const ControlGroup = ({ label, value, min, max, step, onChange, suffix, displayMult = 1 }: any) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center px-1">
      <label className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</label>
      <span className="text-[9px] font-mono text-blue-400 font-bold">{Math.round(value * displayMult)}{suffix}</span>
    </div>
    <input 
      type="range" min={min} max={max} step={step} 
      value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))} 
      className="w-full h-1 bg-white/5 rounded-full appearance-none accent-blue-600 cursor-pointer hover:accent-blue-400 transition-all" 
    />
  </div>
);

const ToggleSwitch = ({ label, enabled, onToggle }: any) => (
  <button 
    onClick={onToggle}
    className="w-full flex items-center justify-between py-2 group"
  >
    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">{label}</span>
    <div className={`w-8 h-4 rounded-full relative transition-colors ${enabled ? 'bg-blue-600' : 'bg-white/10'}`}>
      <div className={`absolute top-0.5 bottom-0.5 w-3 rounded-full bg-white transition-all shadow-md ${enabled ? 'left-4.5 right-0.5' : 'left-0.5'}`}></div>
    </div>
  </button>
);

export default App;
