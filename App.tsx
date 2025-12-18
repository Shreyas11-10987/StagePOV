
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AudioSettings, SpeakerPosition, VaultPlaylist } from './types';
import { AUDIO_PRESETS, SPEAKER_LAYOUTS } from './constants';
import { audioEngine } from './services/audioEngine';
import { Visualizer } from './components/Visualizer';
import { SpatialGrid } from './components/SpatialGrid';
import { ThreeDSpatialView } from './components/ThreeDSpatialView';
import { vaultDb, VaultSong } from './services/vaultDb';

const BIT_DEPTH_OPTIONS = [16, 24, 32] as const;
const SAMPLE_RATE_MAP: Record<number, number[]> = {
  16: [44100, 48000],
  24: [48000, 96000],
  32: [96000, 192000]
};

const StagePOVLogo = ({ isTheater }: { isTheater: boolean }) => (
  <div className={`relative transition-all duration-1000 ${isTheater ? 'w-24 h-24' : 'w-12 h-12'} flex items-center justify-center`}>
    <div className="absolute inset-0 border-[2px] border-blue-500/20 rounded-lg transform rotate-45"></div>
    <div className="absolute inset-2 border-[2px] border-blue-500/40 rounded-lg transform -rotate-45"></div>
    <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_white]"></div>
  </div>
);

const App: React.FC = () => {
  const [settings, setSettings] = useState<AudioSettings>({
    volume: 1.8, 
    bass: 0, 
    treble: 2, 
    vocalClarity: 5, 
    spatiality: 0.8,
    reverbLevel: 0, 
    isAtmosEnabled: true, selectedPreset: 'Pure Direct', isTheaterMode: false,
    isHdAudioEnabled: false, // Default HD Audio OFF
    isHeadTrackingEnabled: false, isDolbyVisionEnabled: false, surroundLevel: 0.7,
    heightLevel: 0.5, drc: 0.1, lfeCrossover: 80, centerSpread: 0.4,
    speakerDelay: 0,
    phaseAlignment: 0,
    bitDepth: 16,
    sampleRate: 48000
  });

  const [speakers, setSpeakers] = useState<SpeakerPosition[]>(SPEAKER_LAYOUTS['Atmos 7.1.4']);
  const [activeLayout, setActiveLayout] = useState('Atmos 7.1.4');
  const [activeView, setActiveView] = useState<'deck' | 'stage' | 'vault'>('deck');
  const [isReady, setIsReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mediaData, setMediaData] = useState<{ name: string, url: string, id?: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Vault & Library State
  const [vaultSongs, setVaultSongs] = useState<VaultSong[]>([]);
  const [playlists, setPlaylists] = useState<VaultPlaylist[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Sorting & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  
  // Playlist Creation Mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());

  // Playback Queue
  const [playbackQueue, setPlaybackQueue] = useState<VaultSong[]>([]);

  const mediaRef = useRef<HTMLAudioElement>(null);
  const vaultInputRef = useRef<HTMLInputElement>(null);
  const restoreTimeRef = useRef(0);

  // Sync restoreTimeRef with currentTime state
  useEffect(() => {
    restoreTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (mediaRef.current && isReady) {
      const resumeTime = restoreTimeRef.current;

      audioEngine.init(mediaRef.current, settings.sampleRate, settings.bitDepth).then(() => {
        updateEngine();
        
        if (mediaRef.current) {
          if (resumeTime > 0.5) { 
             mediaRef.current.currentTime = resumeTime;
          }
          if (isPlaying) mediaRef.current.play();
        }
      });
    }
  }, [isReady, settings.sampleRate, settings.bitDepth]);

  useEffect(() => {
    if (mediaRef.current && mediaData) {
      updateEngine();
      if (isPlaying) mediaRef.current.play();
    }
  }, [mediaData?.url]);

  const updateEngine = () => {
    if (!audioEngine.isActive()) return;
    audioEngine.setVolume(settings.volume);
    audioEngine.setBass(settings.bass);
    audioEngine.setTreble(settings.treble);
    audioEngine.setVocalClarity(settings.vocalClarity);
    audioEngine.setReverb(settings.reverbLevel);
    audioEngine.setTheaterMode(settings.isTheaterMode);
    audioEngine.setHdMode(settings.isHdAudioEnabled); // Update HD Mode
    audioEngine.setDRC(settings.drc);
    audioEngine.setHeightLevel(settings.heightLevel);
    audioEngine.setLfeCrossover(settings.lfeCrossover);
    audioEngine.setSpeakerCalibration(settings.speakerDelay, settings.phaseAlignment);
    audioEngine.applyPreset(settings.selectedPreset);
    
    // CENTROID CALCULATION
    const activeSpeakers = speakers.filter(s => s.isActive);
    if (activeSpeakers.length > 0) {
      let sumY = 0, sumZ = 0;
      activeSpeakers.forEach(s => {
        // sumX excluded to enforce center anchor
        sumY += s.y;
        sumZ += s.z;
      });
      // Force X to 0 to keep sound center-anchored regardless of speaker distribution
      const cx = 0; 
      const cy = sumY / activeSpeakers.length;
      const cz = sumZ / activeSpeakers.length;
      audioEngine.setSpatialPosition(cx, cy, cz === 0 ? 0.5 : cz);
    } else {
      audioEngine.setSpatialPosition(0, 0, 1);
    }
  };

  useEffect(() => { updateEngine(); }, [settings, speakers]);

  useEffect(() => {
    if (isReady) refreshVault();
  }, [isReady]);

  useEffect(() => {
    if (settings.isTheaterMode) {
      document.body.classList.add('theater-active');
    } else {
      document.body.classList.remove('theater-active');
    }
  }, [settings.isTheaterMode]);

  const refreshVault = async () => {
    const songs = await vaultDb.getAllSongs();
    const playlists = await vaultDb.getAllPlaylists();
    setVaultSongs(songs);
    setPlaylists(playlists);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length > 1) {
      await handleVaultUpload(e);
      alert(`${files.length} masters secured in Vault.`);
      return;
    }

    const file = files[0];
    if (mediaData?.url && !mediaData.id) URL.revokeObjectURL(mediaData.url);
    const url = URL.createObjectURL(file);
    setMediaData({ name: file.name.replace(/\.[^/.]+$/, ""), url });
    setIsPlaying(false);
    setPlaybackQueue([]); 
  };

  const handleVaultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsSaving(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const songId = `song_${Date.now()}_${i}`;
        await vaultDb.saveSong({
          id: songId,
          name: file.name.replace(/\.[^/.]+$/, ""),
          blob: file,
          size: file.size,
          type: file.type,
          dateAdded: Date.now()
        });
      }
      await refreshVault();
    } catch (err) {
      console.error("Bulk Save Error:", err);
    } finally {
      setIsSaving(false);
      if (e.target) e.target.value = '';
    }
  };

  const saveToVault = async () => {
    if (!mediaData || isSaving) return;
    setIsSaving(true);
    try {
      const response = await fetch(mediaData.url);
      const blob = await response.blob();
      const songId = `song_${Date.now()}`;
      await vaultDb.saveSong({
        id: songId,
        name: mediaData.name,
        blob: blob,
        size: blob.size,
        type: blob.type,
        dateAdded: Date.now()
      });
      setMediaData({ ...mediaData, id: songId });
      await refreshVault();
    } catch (err) {
      console.error("Vault Save Error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const playSongFromVault = (song: VaultSong, queue: VaultSong[] = []) => {
    if (mediaData?.url && !mediaData.id) URL.revokeObjectURL(mediaData.url);
    const url = URL.createObjectURL(song.blob);
    setMediaData({ name: song.name, url, id: song.id });
    
    if (queue.length > 0) {
      const index = queue.findIndex(s => s.id === song.id);
      if (index !== -1 && index < queue.length - 1) {
        setPlaybackQueue(queue.slice(index + 1));
      } else {
        setPlaybackQueue([]);
      }
    } else {
      setPlaybackQueue([]);
    }

    setActiveView('deck');
    setIsPlaying(true);
  };

  const onPlaybackEnded = () => {
    if (playbackQueue.length > 0) {
      const nextSong = playbackQueue[0];
      playSongFromVault(nextSong, playbackQueue);
    } else {
      setIsPlaying(false);
    }
  };

  const deleteFromVault = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await vaultDb.deleteSong(id);
    await refreshVault();
  };

  const deletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await vaultDb.deletePlaylist(id);
    if (selectedPlaylistId === id) setSelectedPlaylistId(null);
    await refreshVault();
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

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedSongIds(new Set());
  };

  const toggleSongSelection = (id: string) => {
    const newSet = new Set(selectedSongIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSongIds(newSet);
  };

  const createPlaylist = async () => {
    if (selectedSongIds.size === 0) return;
    const name = window.prompt("Enter Playlist Name:");
    if (!name) return;

    await vaultDb.savePlaylist({
      id: `pl_${Date.now()}`,
      name,
      songIds: Array.from(selectedSongIds),
      dateCreated: Date.now()
    });

    setIsSelectionMode(false);
    setSelectedSongIds(new Set());
    await refreshVault();
  };

  const filteredAndSortedSongs = useMemo(() => {
    let result = [...vaultSongs];

    if (selectedPlaylistId) {
      const pl = playlists.find(p => p.id === selectedPlaylistId);
      if (pl) {
        const idSet = new Set(pl.songIds);
        result = result.filter(s => idSet.has(s.id));
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'size') return b.size - a.size;
      return b.dateAdded - a.dateAdded; 
    });

    return result;
  }, [vaultSongs, playlists, selectedPlaylistId, searchQuery, sortBy]);

  const NavItem = ({ id, label, icon }: { id: typeof activeView, label: string, icon: React.ReactNode }) => (
    <button 
      onClick={() => setActiveView(id)}
      className={`flex flex-col md:flex-row items-center gap-3 md:gap-4 px-6 py-4 rounded-xl transition-all duration-300 ${activeView === id ? 'text-white bg-blue-600/20 border border-blue-500/30' : 'text-slate-500 hover:bg-white/5'}`}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </button>
  );

  if (!isReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#020205] z-[300]">
        <div className="text-center space-y-12 animate-in zoom-in duration-1000 px-6">
          <div className="flex justify-center"><StagePOVLogo isTheater={false} /></div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black italic text-white tracking-tighter">Stage<span className="text-blue-500">POV</span></h1>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.5em]">PRO CINEMA AUDIO SUITE</p>
          </div>
          <button onClick={() => setIsReady(true)} className="px-12 py-5 bg-white text-black font-black uppercase text-[11px] tracking-widest rounded-md hover:bg-blue-500 hover:text-white transition-all shadow-2xl">Initialize Master Bus</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full flex flex-col md:flex-row bg-[#020205] text-white overflow-hidden font-inter transition-colors duration-1000 ${settings.isTheaterMode ? 'bg-black' : ''}`}>
      
      <audio 
        key={`${settings.sampleRate}-${settings.bitDepth}`}
        ref={mediaRef} 
        src={mediaData?.url || ''}
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
        onEnded={onPlaybackEnded}
        onTimeUpdate={() => setCurrentTime(mediaRef.current?.currentTime || 0)} 
        onLoadedMetadata={() => setDuration(mediaRef.current?.duration || 0)} 
      />

      <aside className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 p-6 md:p-10 flex md:flex-col justify-between shrink-0 bg-black/80 backdrop-blur-3xl z-50 nav-transition ${settings.isTheaterMode ? 'opacity-0 pointer-events-none -translate-x-full' : 'opacity-100'}`}>
        <div className="flex md:flex-col gap-10 items-center md:items-stretch w-full">
          <div className="hidden md:flex items-center gap-5">
            <StagePOVLogo isTheater={false} />
            <div className="flex flex-col">
              <span className="font-black italic text-lg tracking-tighter uppercase leading-none">STAGE<span className="text-blue-500">POV</span></span>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">MASTERING V1.2</span>
            </div>
          </div>
          <nav className="flex md:flex-col gap-2 flex-1 justify-around md:justify-start w-full">
            <NavItem id="deck" label="THE DECK" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>} />
            <NavItem id="stage" label="STAGING" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>} />
            <NavItem id="vault" label="THE VAULT" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/></svg>} />
          </nav>
        </div>
        
        <button onClick={() => setIsSettingsOpen(true)} className="hidden md:flex items-center justify-between w-full px-6 py-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group">
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">DSP MASTER</span>
           <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
        </button>
      </aside>

      <main className={`flex-1 flex flex-col min-w-0 transition-all duration-1000 ${settings.isTheaterMode ? 'bg-black' : 'bg-[#050508]'}`}>
        <div className="flex-1 overflow-y-auto custom-scroll p-6 md:p-12 pb-32 md:pb-12 h-full flex flex-col relative">
          
          {settings.isTheaterMode && (
             <div className="absolute top-10 right-10 z-[100] animate-in fade-in">
               <button 
                 onClick={() => setSettings(s => ({ ...s, isTheaterMode: false }))}
                 className="px-6 py-3 rounded-full bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
               >
                 Exit Theater
               </button>
             </div>
          )}

          {activeView === 'deck' && (
            <div className={`flex-1 flex flex-col max-w-5xl mx-auto w-full animate-in fade-in duration-500 ${settings.isTheaterMode ? 'justify-center' : ''}`}>
              <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                {!mediaData ? (
                  <label className="w-full max-w-xl aspect-square rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all p-12 text-center bg-black/20 group">
                    <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-10 border border-blue-500/20 group-hover:scale-110 transition-transform">
                      <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19V6l12 7-12 7zM9 19H7V6h2v13z"/></svg>
                    </div>
                    <span className="text-lg font-black uppercase tracking-[0.4em] text-white">Upload New Master</span>
                    <p className="text-[10px] text-slate-500 mt-4 uppercase font-bold tracking-[0.2em]">Lossless 48kHz WAV/FLAC Preferred</p>
                    <input type="file" multiple className="hidden" accept="audio/*" onChange={handleFileUpload} />
                  </label>
                ) : (
                  <div className="w-full flex flex-col items-center gap-12">
                    <div className={`w-full max-w-4xl transition-all duration-1000 ${settings.isTheaterMode ? 'scale-110' : 'scale-100'} aspect-video rounded-[3rem] overflow-hidden border border-white/5 shadow-3xl bg-black/40 p-12 relative flex items-center justify-center`}>
                       <div className="absolute inset-0 bg-blue-500/[0.02]"></div>
                       <Visualizer />
                    </div>
                    <div className={`space-y-6 text-center nav-transition ${settings.isTheaterMode ? 'opacity-40' : 'opacity-100'}`}>
                      <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase truncate px-8 max-w-4xl">{mediaData.name}</h2>
                      <div className="flex items-center justify-center gap-6">
                        <span className="px-5 py-2 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest">
                          {settings.bitDepth}-BIT MASTER
                        </span>
                        {!mediaData.id && (
                          <button 
                            onClick={saveToVault}
                            disabled={isSaving}
                            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                          >
                            <svg className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                            {isSaving ? 'STAGING...' : 'SAVE TO CLOUD VAULT'}
                          </button>
                        )}
                        {mediaData.id && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-green-500/70 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
                            SECURED IN VAULT
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {mediaData && (
                <div className={`w-full max-w-4xl mx-auto bg-white/5 backdrop-blur-3xl p-8 md:p-10 rounded-[2.5rem] border border-white/10 mt-12 mb-10 shadow-2xl nav-transition ${settings.isTheaterMode ? 'opacity-20 hover:opacity-100 translate-y-10' : 'opacity-100'}`}>
                   <div className="flex flex-col md:flex-row items-center gap-10">
                      <div className="flex items-center gap-6">
                        <button onClick={togglePlay} className="w-20 h-20 rounded-3xl bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl">
                          {isPlaying ? <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                        </button>
                      </div>
                      
                      <div className="flex-1 flex flex-col gap-4 w-full">
                         <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden relative group/seek cursor-pointer" 
                              onClick={(e) => {
                                if(mediaRef.current && duration) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const pos = (e.clientX - rect.left) / rect.width;
                                  mediaRef.current.currentTime = pos * duration;
                                }
                              }}>
                            <div className="h-full bg-blue-600 transition-all duration-300 rounded-full" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                         </div>
                         <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500">
                            <span className="text-blue-500">{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                         </div>
                      </div>

                      <button onClick={() => setMediaData(null)} className="p-3 rounded-xl bg-white/5 text-slate-500 hover:text-red-500 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                   </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'stage' && (
            <div className="h-full flex flex-col gap-10 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
               <div className={`flex-1 transition-all duration-1000 ${settings.isTheaterMode ? 'p-0' : 'p-0'}`}>
                  <div className={`w-full h-full bg-black rounded-[3rem] overflow-hidden border border-white/5 shadow-3xl relative`}>
                    <ThreeDSpatialView speakers={speakers} listenerPos={{x:0, y:0}} headRotation={0} isTheaterMode={settings.isTheaterMode} />
                  </div>
               </div>
               <div className={`bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl nav-transition ${settings.isTheaterMode ? 'opacity-0 scale-95 translate-y-10' : 'opacity-100 scale-100'}`}>
                  <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
                    <div className="space-y-1">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-500">Spatial Topology</h3>
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">Live Acoustic Stage Control</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {Object.keys(SPEAKER_LAYOUTS).map(l => (
                         <button key={l} onClick={() => { setSpeakers(SPEAKER_LAYOUTS[l]); setActiveLayout(l); }} 
                                 className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${activeLayout === l ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}>
                           {l}
                         </button>
                       ))}
                    </div>
                  </div>
                  <div className="h-72"><SpatialGrid speakers={speakers} onSpeakerMove={(id, x, z) => {
                    setSpeakers(prev => prev.map(s => s.id === id ? { ...s, x, z } : s));
                  }} onToggleSpeaker={() => {}} /></div>
               </div>
            </div>
          )}

          {activeView === 'vault' && (
            <div className="max-w-7xl mx-auto space-y-8 w-full animate-in fade-in duration-500 h-full flex flex-col">
               <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-white/5 pb-8 shrink-0">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">The <span className="text-blue-500">Vault</span></h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">BROWSER-CLOUD PERSISTENT STORAGE</p>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                    <div className="relative group flex-1 md:flex-none">
                      <input 
                        type="text" 
                        placeholder="FILTER LIBRARY..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-[10px] font-black uppercase tracking-widest text-white placeholder-slate-600 outline-none focus:border-blue-500/50 w-full md:w-64 transition-all"
                      />
                      <svg className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>

                    <div className="flex gap-2">
                      {(['date', 'name', 'size'] as const).map(mode => (
                        <button 
                          key={mode}
                          onClick={() => setSortBy(mode)}
                          className={`px-4 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === mode ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    <div className="h-full w-px bg-white/10 mx-2 hidden md:block"></div>

                    {/* Hidden Input for Vault Upload */}
                    <input 
                      type="file" 
                      multiple 
                      accept="audio/*" 
                      className="hidden" 
                      ref={vaultInputRef}
                      onChange={handleVaultUpload}
                    />

                    {isSelectionMode ? (
                      <div className="flex gap-2 animate-in fade-in">
                        <button 
                          onClick={createPlaylist}
                          disabled={selectedSongIds.size === 0}
                          className="px-6 py-3 rounded-xl bg-green-600 text-white font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          Save Playlist ({selectedSongIds.size})
                        </button>
                        <button 
                          onClick={toggleSelectionMode}
                          className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white font-black text-[9px] uppercase tracking-widest transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => vaultInputRef.current?.click()}
                          className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                          Import Audio
                        </button>
                        <button 
                          onClick={toggleSelectionMode}
                          className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-blue-400 hover:bg-blue-600/20 hover:border-blue-500/30 font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                          New Playlist
                        </button>
                      </div>
                    )}
                  </div>
               </header>
               
               <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
                 {/* Playlists Sidebar */}
                 <div className="w-full md:w-64 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scroll pr-2">
                   <div 
                     onClick={() => setSelectedPlaylistId(null)}
                     className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedPlaylistId === null ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                   >
                     <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black uppercase tracking-widest">All Songs</span>
                       <span className="text-[9px] font-mono opacity-50">{vaultSongs.length}</span>
                     </div>
                   </div>

                   {playlists.length > 0 && <div className="h-px bg-white/5 my-2"></div>}
                   
                   {playlists.map(pl => (
                     <div 
                       key={pl.id}
                       onClick={() => setSelectedPlaylistId(pl.id)}
                       className={`p-4 rounded-xl border cursor-pointer transition-all group relative ${selectedPlaylistId === pl.id ? 'bg-blue-600/20 border-blue-500/30 text-white' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                     >
                       <div className="flex justify-between items-center">
                         <span className="text-[10px] font-black uppercase tracking-widest truncate pr-4">{pl.name}</span>
                         <span className="text-[9px] font-mono opacity-50">{pl.songIds.length}</span>
                       </div>
                       <button 
                         onClick={(e) => deletePlaylist(pl.id, e)}
                         className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                       >
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                       </button>
                     </div>
                   ))}
                 </div>

                 {/* Song Grid */}
                 <div className="flex-1 overflow-y-auto custom-scroll">
                    {filteredAndSortedSongs.length === 0 ? (
                      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]">
                          <div className="text-slate-600 space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest">No songs found in this view</p>
                          </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {filteredAndSortedSongs.map(song => (
                            <div 
                              key={song.id} 
                              onClick={() => isSelectionMode ? toggleSongSelection(song.id) : playSongFromVault(song, filteredAndSortedSongs)}
                              className={`group relative p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                                isSelectionMode 
                                  ? selectedSongIds.has(song.id) 
                                    ? 'bg-blue-600/20 border-blue-500' 
                                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                                  : mediaData?.id === song.id 
                                    ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/20' 
                                    : 'bg-white/[0.03] border-white/5 hover:border-blue-500/30'
                              }`}
                            >
                              <div className="flex items-center gap-5 overflow-hidden">
                                  {isSelectionMode ? (
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${selectedSongIds.has(song.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-white/20 bg-black/40'}`}>
                                      {selectedSongIds.has(song.id) && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                                    </div>
                                  ) : (
                                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all ${mediaData?.id === song.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 group-hover:bg-white/10'}`}>
                                      {mediaData?.id === song.id && isPlaying ? (
                                        <div className="flex items-end gap-0.5 h-4">
                                          <div className="w-1 bg-white animate-[bounce_1s_infinite]"></div>
                                          <div className="w-1 bg-white animate-[bounce_1.2s_infinite]"></div>
                                          <div className="w-1 bg-white animate-[bounce_0.8s_infinite]"></div>
                                        </div>
                                      ) : (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                      )}
                                    </div>
                                  )}
                                  
                                  <div className="min-w-0">
                                    <h4 className={`text-sm font-black italic tracking-tight uppercase truncate ${mediaData?.id === song.id ? 'text-blue-400' : 'text-slate-200'}`}>{song.name}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{(song.size / 1024 / 1024).toFixed(1)} MB</span>
                                      <span className="text-slate-700">•</span>
                                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{new Date(song.dateAdded).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                              </div>
                              
                              {!isSelectionMode && (
                                <button 
                                  onClick={(e) => deleteFromVault(song.id, e)}
                                  className="p-2 rounded-lg bg-white/0 hover:bg-red-500/10 text-slate-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                 </div>
               </div>
            </div>
          )}

        </div>
      </main>

      <div className={`fixed inset-0 z-[200] transition-all duration-500 ${isSettingsOpen ? 'visible' : 'invisible'}`}>
        <div className={`absolute inset-0 bg-black/95 transition-opacity duration-500 ${isSettingsOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsSettingsOpen(false)}></div>
        <div className={`absolute top-0 right-0 h-full w-full md:w-[480px] bg-black border-l border-white/10 p-12 shadow-3xl transition-transform duration-500 ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
           <header className="flex justify-between items-center mb-16">
              <h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">DSP <span className="text-blue-500">Rack</span></h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white transition-colors p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
           </header>
           
           <div className="flex-1 overflow-y-auto pr-4 space-y-16 custom-scroll">
              <section className="space-y-10">
                 <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em]">Engine Clock</h3>
                 <div className="space-y-8">
                   <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bit Depth Architecture</label>
                     <div className="grid grid-cols-3 gap-3">
                       {BIT_DEPTH_OPTIONS.map(bit => (
                         <button key={bit} 
                                 onClick={() => setSettings(p => ({ ...p, bitDepth: bit }))}
                                 className={`py-4 rounded-xl border font-black text-[11px] transition-all ${settings.bitDepth === bit ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                           {bit}-BIT
                         </button>
                       ))}
                     </div>
                   </div>
                   <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sample Frequency</label>
                     <div className="grid grid-cols-2 gap-3">
                       {SAMPLE_RATE_MAP[settings.bitDepth].map(freq => (
                         <button key={freq} 
                                 onClick={() => setSettings(p => ({ ...p, sampleRate: freq }))}
                                 className={`py-4 rounded-xl border font-black text-[11px] transition-all ${settings.sampleRate === freq ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                           {freq/1000} kHz
                         </button>
                       ))}
                     </div>
                   </div>
                 </div>
              </section>

              <section className="space-y-12 pb-20">
                 <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em]">Cinema Presets</h3>
                 <div className="grid grid-cols-2 gap-3">
                    {AUDIO_PRESETS.map(p => (
                       <button key={p} 
                               onClick={() => setSettings(s => ({ ...s, selectedPreset: p }))}
                               className={`py-4 px-2 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all ${settings.selectedPreset === p ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>
                         {p}
                       </button>
                    ))}
                 </div>
                 
                 <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em]">Processing Path</h3>
                 <ControlGroup label="Master Level" value={settings.volume} min={0} max={3} step={0.01} onChange={v => setSettings(p => ({...p, volume: v}))} suffix="%" displayMult={100} />
                 <ControlGroup label="LFE / Bass" value={settings.bass} min={-10} max={15} step={1} onChange={v => setSettings(p => ({...p, bass: v}))} suffix="db" />
                 <ControlGroup label="Verticality" value={settings.heightLevel} min={0} max={1} step={0.1} onChange={v => setSettings(p => ({...p, heightLevel: v}))} suffix="%" displayMult={100} />
                 <ControlGroup label="Ambience / Reverb" value={settings.reverbLevel} min={0} max={1} step={0.05} onChange={v => setSettings(p => ({...p, reverbLevel: v}))} suffix="" displayMult={100} />
                 
                 <div className="space-y-8 pt-8 border-t border-white/5">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Advanced Calibration</h4>
                   <ControlGroup label="Speaker Delay" value={settings.speakerDelay} min={0} max={100} step={1} onChange={v => setSettings(p => ({...p, speakerDelay: v}))} suffix="ms" />
                   <ControlGroup label="Phase Alignment" value={settings.phaseAlignment} min={-5} max={5} step={0.1} onChange={v => setSettings(p => ({...p, phaseAlignment: v}))} suffix="ms" />
                   <ControlGroup label="LFE Crossover" value={settings.lfeCrossover} min={40} max={250} step={5} onChange={v => setSettings(p => ({...p, lfeCrossover: v}))} suffix="Hz" />
                 </div>

                 <ToggleSwitch label="Theater Mode" enabled={settings.isTheaterMode} onToggle={() => setSettings(p => ({...p, isTheaterMode: !p.isTheaterMode}))} />
                 {/* New HD Audio Switch */}
                 <ToggleSwitch label="HD Audio (Hi-Res)" enabled={settings.isHdAudioEnabled} onToggle={() => setSettings(p => ({...p, isHdAudioEnabled: !p.isHdAudioEnabled}))} />
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
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
      <span className="text-[11px] font-mono text-blue-400 font-black">{Math.round(value * displayMult)}{suffix}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-blue-500 bg-white/5 h-[4px] rounded-full appearance-none cursor-pointer" />
  </div>
);

const ToggleSwitch = ({ label, enabled, onToggle }: any) => (
  <button onClick={onToggle} className="w-full flex items-center justify-between py-6 px-8 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    <div className={`w-14 h-7 rounded-full relative transition-all duration-300 ${enabled ? 'bg-blue-600 shadow-xl' : 'bg-slate-800'}`}>
      <div className={`absolute top-1 bottom-1 w-5 rounded-full bg-white transition-all ${enabled ? 'left-8' : 'left-1'}`}></div>
    </div>
  </button>
);

export default App;
