
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
    volume: 0.8,
    bass: 5,
    treble: 2,
    vocalClarity: 5,
    spatiality: 0.8,
    isAtmosEnabled: true,
    selectedPreset: 'Reference',
    isTheaterMode: true,
    isHeadTrackingEnabled: false,
    isDolbyVisionEnabled: true,
  });

  const [speakers, setSpeakers] = useState<SpeakerPosition[]>(SPEAKER_LAYOUTS['Atmos 7.1.4']);
  const [headRotation, setHeadRotation] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [currentLayout, setCurrentLayout] = useState('Atmos 7.1.4');
  
  const mediaRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (mediaRef.current && isReady) {
      audioEngine.init(mediaRef.current);
      audioEngine.setVolume(settings.volume);
      audioEngine.setBass(settings.bass);
      audioEngine.setTreble(settings.treble);
      audioEngine.setVocalClarity(settings.vocalClarity);
      audioEngine.setTheaterMode(settings.isTheaterMode);
    }
  }, [isReady]);

  const handleSliderChange = (key: keyof AudioSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    if (key === 'volume') audioEngine.setVolume(value);
    if (key === 'bass') audioEngine.setBass(value);
    if (key === 'treble') audioEngine.setTreble(value);
    if (key === 'vocalClarity') audioEngine.setVocalClarity(value);
    if (key === 'isTheaterMode') audioEngine.setTheaterMode(value);
  };

  const handleSpeakerMove = (id: string, x: number, z: number) => {
    setSpeakers(prev => prev.map(s => s.id === id ? { ...s, x, z } : s));
    // In a real multi-channel setup, each panner would be updated.
    // For this demo, we update the primary spatial focus based on the first active speaker moved.
    audioEngine.setSpatialPosition(x, 0, z);
  };

  const handleToggleSpeaker = (id: string) => {
    setSpeakers(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
  };

  const applyLayout = (layoutName: string) => {
    setSpeakers(SPEAKER_LAYOUTS[layoutName]);
    setCurrentLayout(layoutName);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && mediaRef.current) {
      if (file.size > 5 * 1024 * 1024 * 1024) {
        alert("File exceeds 5GB limit.");
        return;
      }
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      mediaRef.current.src = url;
      audioEngine.resume();
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#020205] text-white">
        <div className="relative group mb-12">
           <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2.5rem] blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
           <div className="relative w-32 h-32 bg-[#0a0a0c] rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl">
              <span className="text-6xl font-black italic tracking-tighter text-blue-500">A</span>
           </div>
        </div>
        <h1 className="text-5xl font-black mb-6 tracking-tight uppercase italic text-center">AtmosSphere <span className="text-blue-500">PRO</span></h1>
        <p className="text-slate-400 max-w-sm mb-12 text-center leading-relaxed font-medium uppercase text-xs tracking-widest">
          High Bitrate Spatial Cinema Processor <br/> 
          <span className="text-slate-600">Headphone Virtualization & Object Control</span>
        </p>
        <button 
          onClick={() => setIsReady(true)}
          className="px-20 py-5 bg-white text-black font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-blue-50 transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(255,255,255,0.2)]"
        >
          Initialize Core
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020205] text-white p-4 lg:p-10 font-sans selection:bg-blue-500/30">
      <div className="max-w-screen-2xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Sidebar - Controls */}
        <aside className="lg:col-span-3 space-y-8">
          <header className="flex items-center gap-4 mb-12">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <span className="text-xl font-black italic">A</span>
            </div>
            <div>
              <h1 className="text-xl font-black italic uppercase tracking-tighter">AtmosSphere</h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cinema Studio v4.5</p>
            </div>
          </header>

          <section className="glass rounded-[2rem] p-8 border border-white/5 space-y-10">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Master Gain</h2>
              <span className="text-xs font-mono text-white/40">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" 
              value={settings.volume} 
              onChange={(e) => handleSliderChange('volume', parseFloat(e.target.value))} 
              className="w-full h-1 bg-white/5 rounded-full appearance-none accent-white"
            />

            <div className="space-y-8 pt-4">
              <ControlGroup label="Dialogue Clarity" value={settings.vocalClarity} min={0} max={12} onChange={(v) => handleSliderChange('vocalClarity', v)} />
              <ControlGroup label="LFE Sub Bass" value={settings.bass} min={-10} max={20} onChange={(v) => handleSliderChange('bass', v)} />
              <ControlGroup label="Air / Treble" value={settings.treble} min={-10} max={10} onChange={(v) => handleSliderChange('treble', v)} />
            </div>

            <button 
              onClick={() => handleSliderChange('isTheaterMode', !settings.isTheaterMode)}
              className={`w-full py-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${settings.isTheaterMode ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/5 text-slate-500'}`}
            >
              <span className="text-[10px] font-black tracking-[0.2em] uppercase">Theater Simulation</span>
            </button>
          </section>

          <section className="glass rounded-[2rem] p-8 border border-white/5">
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6">Visualizer</h2>
             <Visualizer />
          </section>
        </aside>

        {/* Center - Cinema & Visualization */}
        <main className="lg:col-span-6 space-y-10">
          <div className="relative glass rounded-[3rem] overflow-hidden aspect-video bg-black border border-white/5 shadow-2xl group">
             <video 
              ref={mediaRef} 
              className={`w-full h-full object-contain transition-all duration-700 ${settings.isDolbyVisionEnabled ? 'saturate-[1.2] brightness-[1.05]' : ''}`}
              controls 
            />
            {!fileName && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-black/60 backdrop-blur-3xl text-center">
                <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mb-8 border border-blue-600/20">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4">Cinema Core</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10">Drop MKV/MP4 up to 5GB</p>
                <label className="px-12 py-4 bg-white text-black font-black uppercase tracking-[0.2em] text-xs rounded-xl hover:scale-105 active:scale-95 transition-all cursor-pointer">
                  Import File
                  <input type="file" className="hidden" accept="video/mp4,video/x-matroska,video/*" onChange={handleFileUpload} />
                </label>
              </div>
            )}
            {fileName && (
               <div className="absolute top-6 left-6 flex gap-3 pointer-events-none">
                  <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-lg border border-white/10 text-[9px] font-black tracking-widest uppercase">{currentLayout}</div>
                  <div className="bg-blue-600 px-4 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase">Dolby Vision</div>
               </div>
            )}
          </div>

          <ThreeDSpatialView speakers={speakers} listenerPos={{x:0, y:0}} headRotation={headRotation} isTheaterMode={settings.isTheaterMode} />

          <div className="flex justify-between items-center px-4">
             <div className="flex gap-8 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">
                <span>Rendering: 24bit / 192kHz</span>
                <span>Signal: Stable</span>
             </div>
             <HeadTracker enabled={settings.isHeadTrackingEnabled} onRotate={setHeadRotation} />
          </div>
        </main>

        {/* Right Sidebar - Presets & Spatial */}
        <aside className="lg:col-span-3 space-y-8">
           <section className="glass rounded-[2rem] p-8 border border-white/5 space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-2">Layout Presets</h2>
              <div className="grid grid-cols-1 gap-3">
                 {Object.keys(SPEAKER_LAYOUTS).map(name => (
                   <button 
                    key={name}
                    onClick={() => applyLayout(name)}
                    className={`px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all text-left ${currentLayout === name ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                   >
                     {name}
                   </button>
                 ))}
              </div>
           </section>

           <section className="glass rounded-[2rem] p-8 border border-white/5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6">Object Field</h2>
              <SpatialGrid speakers={speakers} onSpeakerMove={handleSpeakerMove} onToggleSpeaker={handleToggleSpeaker} />
              <p className="mt-6 text-[8px] text-center text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                Drag speakers to reposition <br/> Double click to toggle
              </p>
           </section>

           <section className="glass rounded-[2rem] p-8 border border-white/5">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-6">EQ Profiles</h2>
              <div className="grid grid-cols-2 gap-3">
                 {AUDIO_PRESETS.map(p => (
                   <button 
                    key={p}
                    onClick={() => handleSliderChange('selectedPreset', p)}
                    className={`px-3 py-4 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${settings.selectedPreset === p ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}
                   >
                     {p}
                   </button>
                 ))}
              </div>
           </section>
        </aside>

      </div>
    </div>
  );
};

const ControlGroup = ({ label, value, min, max, onChange }: any) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</label>
      <span className="text-[10px] font-mono text-white/30">{value}</span>
    </div>
    <input 
      type="range" min={min} max={max} step="1" 
      value={value} 
      onChange={(e) => onChange(parseInt(e.target.value))} 
      className="w-full h-0.5 bg-white/5 rounded-full appearance-none accent-blue-500 hover:accent-blue-400 transition-all cursor-pointer" 
    />
  </div>
);

export default App;
