
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AudioSettings, SpeakerPosition, VaultPlaylist, VaultMedia } from './types';
import { AUDIO_PRESETS, SPEAKER_LAYOUTS } from './constants';
import { audioEngine } from './services/audioEngine';
import { Visualizer } from './components/Visualizer';
import { SpatialGrid } from './components/SpatialGrid';
import { ThreeDSpatialView } from './components/ThreeDSpatialView';
import { vaultDb } from './services/vaultDb';

declare const chrome: any;

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

const VideoControls = ({ 
  isPlaying, 
  onTogglePlay, 
  currentTime, 
  duration, 
  buffered,
  onSeek, 
  onSkip,
  volume, 
  onVolumeChange, 
  isTheater, 
  onToggleTheater,
  onToggleFullscreen,
  isLive 
}: any) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDragging) {
      setDragTime(currentTime);
    }
  }, [currentTime, isDragging]);

  const calculateTime = (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) => {
    if (!progressBarRef.current || !duration) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    let clientX: number;
    if ('touches' in e) {
       const touch = e.touches[0] || e.changedTouches[0];
       clientX = touch ? touch.clientX : 0;
    } else {
       clientX = (e as MouseEvent).clientX;
    }
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pos * duration;
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isLive) return;
    setIsDragging(true);
    const t = calculateTime(e);
    setDragTime(t);
  };

  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      setDragTime(calculateTime(e));
    };
    const handleDragEnd = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const finalTime = calculateTime(e);
      onSeek(finalTime);
      setIsDragging(false);
    };
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, duration, onSeek]);

  const formatTime = (t: number) => {
    if (isNaN(t)) return "0:00";
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const displayTime = isDragging ? dragTime : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-32 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end z-50 pointer-events-none group-hover:pointer-events-auto">
      
      {/* Seek Bar */}
      {!isLive && (
        <div 
           className="w-full h-8 flex items-center cursor-pointer group/seek"
           onMouseDown={handleDragStart}
           onTouchStart={handleDragStart}
        >
           <div ref={progressBarRef} className="relative w-full h-1 bg-white/20 rounded-full group-hover/seek:h-1.5 transition-all duration-200">
              {/* Buffer Bar */}
              <div className="absolute top-0 left-0 h-full bg-white/10 rounded-full transition-all duration-500" style={{ width: `${bufferPercent}%` }}></div>
              
              {/* Play Progress */}
              <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-full" style={{ width: `${progressPercent}%` }}>
                 {/* Handle */}
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] scale-0 group-hover/seek:scale-100 transition-transform duration-200"></div>
              </div>
           </div>
        </div>
      )}

      {/* Controls Row */}
      <div className="flex items-center justify-between -mt-2">
        <div className="flex items-center gap-6">
          <button onClick={onTogglePlay} className="text-white hover:text-blue-400 transition-colors transform active:scale-95">
            {isPlaying ? (
              <svg className="w-8 h-8 md:w-10 md:h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg className="w-8 h-8 md:w-10 md:h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          
          <div className="flex items-center gap-2">
             <button onClick={() => onSkip(-10)} className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10" title="-10s">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"/></svg>
             </button>
             <button onClick={() => onSkip(10)} className="text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10" title="+10s">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"/></svg>
             </button>
          </div>

          {/* Volume Group */}
          <div className="flex items-center gap-3 group/vol">
             <button onClick={() => onVolumeChange(volume === 0 ? 1 : 0)} className="text-slate-300 hover:text-white">
               {volume === 0 ? (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
               ) : (
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
               )}
             </button>
             <input type="range" min="0" max="3" step="0.01" value={volume} onChange={(e) => onVolumeChange(parseFloat(e.target.value))} className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300 h-1 bg-white/20 rounded-full appearance-none accent-blue-500 hover:bg-white/40" />
          </div>

          <span className="text-xs font-mono font-bold text-slate-400 select-none">
            {isLive ? <span className="text-red-500 animate-pulse flex items-center gap-2">● LIVE SIGNAL</span> : `${formatTime(displayTime)} / ${formatTime(duration)}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={onToggleTheater} className={`text-slate-300 hover:text-white transition-colors p-2 rounded-xl ${isTheater ? 'bg-white/10 text-blue-400' : 'hover:bg-white/10'}`} title="Theater Mode">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7"/></svg>
          </button>
          <button onClick={onToggleFullscreen} className="text-slate-300 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10" title="Fullscreen">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M20 8V4m0 0h-4M4 16v4m0 0h4M20 16v4m0 0h-4"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<AudioSettings>({
    volume: 1.8, 
    bass: 0, 
    treble: 2, 
    vocalClarity: 5, 
    spatiality: 0.8,
    reverbLevel: 0, 
    isAtmosEnabled: true, selectedPreset: 'Pure Direct', isTheaterMode: false,
    isHdAudioEnabled: false,
    isHeadTrackingEnabled: false, 
    isDolbyVisionEnabled: false, 
    surroundLevel: 0.7,
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
  
  const [mediaData, setMediaData] = useState<{ name: string, url: string, id?: string, type?: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isCapturingTab, setIsCapturingTab] = useState(false);
  const [playbackQueue, setPlaybackQueue] = useState<VaultMedia[]>([]);
  
  const [vaultMedia, setVaultMedia] = useState<VaultMedia[]>([]);
  const [playlists, setPlaylists] = useState<VaultPlaylist[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const vaultInputRef = useRef<HTMLInputElement>(null);
  const [videoStyle, setVideoStyle] = useState<React.CSSProperties>({});
  const restoreTimeRef = useRef(0);

  useEffect(() => {
    const updatePosition = () => {
      const baseStyle: React.CSSProperties = {
        // Dolby Vision / HDR Enhancement Style
        filter: settings.isDolbyVisionEnabled 
           ? 'contrast(1.15) saturate(1.2) brightness(1.08) drop-shadow(0 0 40px rgba(0,0,0,0.6))' 
           : 'none',
        transition: 'all 0.5s ease',
      };

      if (settings.isTheaterMode) {
        setVideoStyle({ ...baseStyle, position: 'fixed', inset: 0, zIndex: 50, width: '100%', height: '100%' });
        return;
      }
      
      if (activeView === 'deck' && (mediaData || isCapturingTab) && placeholderRef.current) {
        const rect = placeholderRef.current.getBoundingClientRect();
        setVideoStyle({
          ...baseStyle,
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          zIndex: 40,
          borderRadius: '2.5rem'
        });
      } else {
        setVideoStyle({ ...baseStyle, position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', top: -1000 });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const observer = new ResizeObserver(updatePosition);
    if (placeholderRef.current) observer.observe(placeholderRef.current);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      observer.disconnect();
    };
  }, [settings.isTheaterMode, activeView, mediaData, isCapturingTab, settings.isDolbyVisionEnabled]);

  useEffect(() => {
    restoreTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (videoRef.current && isReady && !isCapturingTab) {
      const resumeTime = restoreTimeRef.current;
      audioEngine.init(videoRef.current, settings.sampleRate, settings.bitDepth).then(() => {
        updateEngine();
        if (videoRef.current) {
          if (resumeTime > 0.5) videoRef.current.currentTime = resumeTime;
          if (isPlaying) videoRef.current.play().catch(e => console.log("Auto-play blocked", e));
        }
      });
    }
  }, [isReady, settings.sampleRate, settings.bitDepth, isCapturingTab]);

  useEffect(() => {
    if (videoRef.current && mediaData) {
      updateEngine();
      if (isPlaying) videoRef.current.play().catch(e => console.log("Play interrupted", e));
    }
  }, [mediaData?.url]);

  const captureTabAudio = () => {
    if (typeof chrome !== 'undefined' && chrome.tabCapture) {
      chrome.tabCapture.capture({ audio: true, video: false }, (stream: any) => {
        if (!stream) {
          console.error("Tab Capture failed or denied.");
          return;
        }
        setIsCapturingTab(true);
        setMediaData({ name: "Live Tab Audio", url: "", type: "live" }); 
        setIsPlaying(true);
        audioEngine.init(stream, settings.sampleRate, settings.bitDepth).then(() => updateEngine());
        stream.getAudioTracks()[0].onended = () => {
          setIsCapturingTab(false);
          setIsPlaying(false);
          setMediaData(null);
        };
      });
    } else {
      alert("Tab Capture API not available.");
    }
  };

  const updateEngine = () => {
    if (!audioEngine.isActive()) return;
    audioEngine.setVolume(settings.volume);
    audioEngine.setBass(settings.bass);
    audioEngine.setTreble(settings.treble);
    audioEngine.setVocalClarity(settings.vocalClarity);
    audioEngine.setReverb(settings.reverbLevel);
    audioEngine.setTheaterMode(settings.isTheaterMode);
    audioEngine.setHdMode(settings.isHdAudioEnabled); 
    audioEngine.setDRC(settings.drc);
    audioEngine.setHeightLevel(settings.heightLevel);
    audioEngine.setSpeakerCalibration(settings.speakerDelay, settings.phaseAlignment);
    audioEngine.applyPreset(settings.selectedPreset);
    
    const activeSpeakers = speakers.filter(s => s.isActive);
    if (activeSpeakers.length > 0) {
      let sumY = 0, sumZ = 0;
      activeSpeakers.forEach(s => { sumY += s.y; sumZ += s.z; });
      audioEngine.setSpatialPosition(0, sumY / activeSpeakers.length, sumZ / activeSpeakers.length);
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
       if (playerContainerRef.current) {
          playerContainerRef.current.requestFullscreen().catch(err => {
             console.log("Container fullscreen failed, falling back to document", err);
             document.documentElement.requestFullscreen();
          });
       } else {
          document.documentElement.requestFullscreen();
       }
    } else {
       if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const refreshVault = async () => {
    const media = await vaultDb.getAllMedia();
    const playlists = await vaultDb.getAllPlaylists();
    setVaultMedia(media);
    setPlaylists(playlists);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      await handleVaultUpload(e);
      alert(`${files.length} videos secured in Vault.`);
      return;
    }
    const file = files[0];
    if (mediaData?.url && !mediaData.id) URL.revokeObjectURL(mediaData.url);
    const url = URL.createObjectURL(file);
    setMediaData({ name: file.name.replace(/\.[^/.]+$/, ""), url, type: file.type });
    setIsPlaying(false);
    setIsCapturingTab(false);
    setPlaybackQueue([]); 
  };

  const handleVaultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsSaving(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const mediaId = `media_${Date.now()}_${i}`;
        await vaultDb.saveMedia({
          id: mediaId,
          name: file.name.replace(/\.[^/.]+$/, ""),
          blob: file,
          size: file.size,
          type: file.type,
          dateAdded: Date.now()
        });
      }
      await refreshVault();
    } catch (err) { console.error("Bulk Save Error:", err); } 
    finally { setIsSaving(false); if (e.target) e.target.value = ''; }
  };

  const saveToVault = async () => {
    if (!mediaData || isSaving || isCapturingTab) return;
    setIsSaving(true);
    try {
      const response = await fetch(mediaData.url);
      const blob = await response.blob();
      const mediaId = `media_${Date.now()}`;
      await vaultDb.saveMedia({
        id: mediaId,
        name: mediaData.name,
        blob: blob,
        size: blob.size,
        type: blob.type,
        dateAdded: Date.now()
      });
      setMediaData({ ...mediaData, id: mediaId });
      await refreshVault();
    } catch (err) { console.error("Vault Save Error:", err); } 
    finally { setIsSaving(false); }
  };

  const playMediaFromVault = (media: VaultMedia, queue: VaultMedia[] = []) => {
    if (mediaData?.url && !mediaData.id) URL.revokeObjectURL(mediaData.url);
    const url = URL.createObjectURL(media.blob);
    setMediaData({ name: media.name, url, id: media.id, type: media.type });
    setIsCapturingTab(false);
    
    if (queue.length > 0) {
      const index = queue.findIndex(s => s.id === media.id);
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
      const nextMedia = playbackQueue[0];
      playMediaFromVault(nextMedia, playbackQueue);
    } else {
      setIsPlaying(false);
    }
  };

  const deleteFromVault = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await vaultDb.deleteMedia(id);
    await refreshVault();
  };

  const deletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await vaultDb.deletePlaylist(id);
    if (selectedPlaylistId === id) setSelectedPlaylistId(null);
    await refreshVault();
  };

  const togglePlay = () => {
    if (isCapturingTab) return;
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        audioEngine.resume();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedMediaIds(new Set());
  };

  const toggleMediaSelection = (id: string) => {
    const newSet = new Set(selectedMediaIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedMediaIds(newSet);
  };

  const createPlaylist = async () => {
    if (selectedMediaIds.size === 0) return;
    const name = window.prompt("Enter Playlist Name:");
    if (!name) return;
    await vaultDb.savePlaylist({ id: `pl_${Date.now()}`, name, mediaIds: Array.from(selectedMediaIds), dateCreated: Date.now() });
    setIsSelectionMode(false);
    setSelectedMediaIds(new Set());
    await refreshVault();
  };

  const filteredAndSortedMedia = useMemo(() => {
    let result = [...vaultMedia];
    if (selectedPlaylistId) {
      const pl = playlists.find(p => p.id === selectedPlaylistId);
      if (pl) {
        const idSet = new Set(pl.mediaIds);
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
  }, [vaultMedia, playlists, selectedPlaylistId, searchQuery, sortBy]);

  const NavItem = ({ id, label, icon }: { id: typeof activeView, label: string, icon: React.ReactNode }) => (
    <button onClick={() => setActiveView(id)} className={`flex flex-col md:flex-row items-center gap-3 md:gap-4 px-6 py-4 rounded-xl transition-all duration-300 ${activeView === id ? 'text-white bg-blue-600/20 border border-blue-500/30' : 'text-slate-500 hover:bg-white/5'}`}>
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
          <button onClick={() => setIsReady(true)} className="px-12 py-5 bg-white text-black font-black uppercase text-[11px] tracking-widest rounded-md hover:bg-blue-500 hover:text-white transition-all shadow-2xl">Initialize Cinema Engine</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full flex flex-col md:flex-row bg-[#020205] text-white overflow-hidden font-inter transition-colors duration-1000 ${settings.isTheaterMode ? 'bg-black' : ''}`}>
      <div ref={playerContainerRef} style={videoStyle} className={`overflow-hidden shadow-2xl transition-all duration-500 bg-black group ${!settings.isTheaterMode && activeView !== 'deck' ? '' : ''}`}>
         <video
            key={`${settings.sampleRate}-${settings.bitDepth}`}
            ref={videoRef} 
            src={mediaData?.url || ''}
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)} 
            onPause={() => setIsPlaying(false)} 
            onEnded={onPlaybackEnded}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)} 
            onProgress={(e) => {
               if (e.currentTarget.buffered.length > 0) {
                  setBuffered(e.currentTarget.buffered.end(e.currentTarget.buffered.length - 1));
               }
            }}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            playsInline
         />
         <VideoControls 
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            currentTime={currentTime}
            duration={duration}
            buffered={buffered}
            onSeek={(t: number) => { if(videoRef.current) videoRef.current.currentTime = t; }}
            onSkip={(dt: number) => { if(videoRef.current) videoRef.current.currentTime += dt; }}
            volume={settings.volume}
            onVolumeChange={(v: number) => setSettings(s => ({...s, volume: v}))}
            isTheater={settings.isTheaterMode}
            onToggleTheater={() => setSettings(s => ({...s, isTheaterMode: !s.isTheaterMode}))}
            onToggleFullscreen={toggleFullscreen}
            isLive={isCapturingTab}
         />
      </div>

      <aside className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 p-6 md:p-10 flex md:flex-col justify-between shrink-0 bg-black/80 backdrop-blur-3xl z-50 nav-transition ${settings.isTheaterMode ? 'opacity-0 pointer-events-none -translate-x-full' : 'opacity-100'}`}>
        <div className="flex md:flex-col gap-10 items-center md:items-stretch w-full">
          <div className="hidden md:flex items-center gap-5">
            <StagePOVLogo isTheater={false} />
            <div className="flex flex-col">
              <span className="font-black italic text-lg tracking-tighter uppercase leading-none">STAGE<span className="text-blue-500">POV</span></span>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em]">CINEMA V2.0</span>
            </div>
          </div>
          <nav className="flex md:flex-col gap-2 flex-1 justify-around md:justify-start w-full">
            <NavItem id="deck" label="CINEMA DECK" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>} />
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
             <div className="absolute top-10 right-10 z-[100] animate-in fade-in group">
               <button onClick={() => setSettings(s => ({ ...s, isTheaterMode: false }))} className="px-6 py-3 rounded-full bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100">Exit Theater</button>
             </div>
          )}
          {activeView === 'deck' && (
            <div className={`flex-1 flex flex-col max-w-6xl mx-auto w-full animate-in fade-in duration-500 ${settings.isTheaterMode ? 'justify-center items-center h-full' : ''}`}>
              {!mediaData && !isCapturingTab && (
                 <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                  <div className="flex flex-col gap-6 w-full max-w-xl">
                    <label className="w-full aspect-video rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all p-12 text-center bg-black/20 group">
                      <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-10 border border-blue-500/20 group-hover:scale-110 transition-transform"><svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></div>
                      <span className="text-lg font-black uppercase tracking-[0.4em] text-white">Upload Video Master</span>
                      <p className="text-[10px] text-slate-500 mt-4 uppercase font-bold tracking-[0.2em]">MP4 / MKV Supported - Up to 10GB</p>
                      <input type="file" multiple className="hidden" accept="video/mp4,video/x-matroska,video/*" onChange={handleFileUpload} />
                    </label>
                    <button onClick={captureTabAudio} className="w-full py-6 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-blue-600/20 hover:border-blue-500/50 transition-all flex items-center justify-center gap-3 group"><svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg><span className="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-white">Capture Active Tab Audio</span></button>
                  </div>
                 </div>
              )}
              {(mediaData || isCapturingTab) && (
                <>
                  <div className={`relative w-full aspect-video bg-black/5 rounded-[2.5rem] mb-8 ${settings.isTheaterMode ? 'hidden' : 'block'}`}>
                      <div ref={placeholderRef} className="w-full h-full"></div>
                  </div>
                  <div className={`w-full flex flex-col items-center gap-12 transition-all ${settings.isTheaterMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="space-y-6 text-center w-full">
                      <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white uppercase truncate px-8 max-w-4xl mx-auto">{mediaData?.name || 'Live Stream'}</h2>
                      <div className="flex items-center justify-center gap-6">
                        <span className="px-5 py-2 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-widest">{isCapturingTab ? 'LIVE INPUT' : `CINEMA VIDEO • ${settings.bitDepth}-BIT AUDIO`}</span>
                        {!isCapturingTab && mediaData && !mediaData.id && (
                          <button onClick={saveToVault} disabled={isSaving} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"><svg className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>{isSaving ? 'UPLOADING...' : 'SAVE TO VAULT'}</button>
                        )}
                        {mediaData?.id && <span className="text-[9px] font-black uppercase tracking-widest text-green-500/70 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>VAULT SECURED</span>}
                      </div>
                    </div>
                    <div className="w-full max-w-4xl h-24 opacity-50"><Visualizer /></div>
                    <button onClick={() => { setMediaData(null); setIsCapturingTab(false); setIsPlaying(false); }} className="px-6 py-4 rounded-xl bg-white/5 text-slate-500 hover:text-red-500 transition-all uppercase text-[10px] font-black tracking-widest border border-transparent hover:border-red-500/30">Close Media</button>
                  </div>
                </>
              )}
            </div>
          )}
          {activeView === 'stage' && (
            <div className="h-full flex flex-col gap-10 max-w-6xl mx-auto w-full animate-in fade-in duration-500">
               <div className={`flex-1 transition-all duration-1000 ${settings.isTheaterMode ? 'p-0' : 'p-0'}`}>
                  <div className={`w-full h-full bg-black rounded-[3rem] overflow-hidden border border-white/5 shadow-3xl relative`}><ThreeDSpatialView speakers={speakers} listenerPos={{x:0, y:0}} headRotation={0} isTheaterMode={settings.isTheaterMode} /></div>
               </div>
               <div className={`bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-10 border border-white/10 shadow-2xl nav-transition ${settings.isTheaterMode ? 'opacity-0 scale-95 translate-y-10' : 'opacity-100 scale-100'}`}>
                  <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
                    <div className="space-y-1"><h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-500">Spatial Topology</h3><p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">Live Acoustic Stage Control</p></div>
                    <div className="flex flex-wrap gap-2">{Object.keys(SPEAKER_LAYOUTS).map(l => (<button key={l} onClick={() => { setSpeakers(SPEAKER_LAYOUTS[l]); setActiveLayout(l); }} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${activeLayout === l ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}>{l}</button>))}</div>
                  </div>
                  <div className="h-72"><SpatialGrid speakers={speakers} onSpeakerMove={(id, x, z) => { setSpeakers(prev => prev.map(s => s.id === id ? { ...s, x, z } : s)); }} onToggleSpeaker={() => {}} /></div>
               </div>
            </div>
          )}
          {activeView === 'vault' && (
            <div className="max-w-7xl mx-auto space-y-8 w-full animate-in fade-in duration-500 h-full flex flex-col">
               <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 border-b border-white/5 pb-8 shrink-0">
                  <div className="space-y-2"><h2 className="text-4xl font-black italic tracking-tighter uppercase text-white">The <span className="text-blue-500">Vault</span></h2><p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">VIDEO LIBRARY STORAGE</p></div>
                  <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
                    <div className="relative group flex-1 md:flex-none"><input type="text" placeholder="FILTER MOVIES..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-[10px] font-black uppercase tracking-widest text-white placeholder-slate-600 outline-none focus:border-blue-500/50 w-full md:w-64 transition-all" /><svg className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></div>
                    <div className="flex gap-2">{(['date', 'name', 'size'] as const).map(mode => (<button key={mode} onClick={() => setSortBy(mode)} className={`px-4 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${sortBy === mode ? 'bg-blue-600 text-white border-blue-500' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'}`}>{mode}</button>))}</div>
                    <div className="h-full w-px bg-white/10 mx-2 hidden md:block"></div>
                    <input type="file" multiple accept="video/mp4,video/x-matroska,video/*" className="hidden" ref={vaultInputRef} onChange={handleVaultUpload} />
                    {isSelectionMode ? (
                      <div className="flex gap-2 animate-in fade-in">
                        <button onClick={createPlaylist} disabled={selectedMediaIds.size === 0} className="px-6 py-3 rounded-xl bg-green-600 text-white font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all">Save List ({selectedMediaIds.size})</button>
                        <button onClick={toggleSelectionMode} className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white font-black text-[9px] uppercase tracking-widest transition-all">Cancel</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => vaultInputRef.current?.click()} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>Import Video</button>
                        <button onClick={toggleSelectionMode} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-blue-400 hover:bg-blue-600/20 hover:border-blue-500/30 font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>New List</button>
                      </div>
                    )}
                  </div>
               </header>
               <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
                 <div className="w-full md:w-64 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scroll pr-2">
                   <div onClick={() => setSelectedPlaylistId(null)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedPlaylistId === null ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}>
                     <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-widest">All Videos</span><span className="text-[9px] font-mono opacity-50">{vaultMedia.length}</span></div>
                   </div>
                   {playlists.length > 0 && <div className="h-px bg-white/5 my-2"></div>}
                   {playlists.map(pl => (
                     <div key={pl.id} onClick={() => setSelectedPlaylistId(pl.id)} className={`p-4 rounded-xl border cursor-pointer transition-all group relative ${selectedPlaylistId === pl.id ? 'bg-blue-600/20 border-blue-500/30 text-white' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}>
                       <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-widest truncate pr-4">{pl.name}</span><span className="text-[9px] font-mono opacity-50">{pl.mediaIds.length}</span></div>
                       <button onClick={(e) => deletePlaylist(pl.id, e)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                     </div>
                   ))}
                 </div>
                 <div className="flex-1 overflow-y-auto custom-scroll">
                    {filteredAndSortedMedia.length === 0 ? (
                      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/[0.01]"><div className="text-slate-600 space-y-4"><p className="text-[10px] font-black uppercase tracking-widest">No media found</p></div></div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {filteredAndSortedMedia.map(item => (
                            <div key={item.id} onClick={() => isSelectionMode ? toggleMediaSelection(item.id) : playMediaFromVault(item, filteredAndSortedMedia)} className={`group relative p-6 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${isSelectionMode ? selectedMediaIds.has(item.id) ? 'bg-blue-600/20 border-blue-500' : 'bg-white/[0.02] border-white/5 hover:border-white/20' : mediaData?.id === item.id ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/20' : 'bg-white/[0.03] border-white/5 hover:border-blue-500/30'}`}>
                              <div className="flex items-center gap-5 overflow-hidden">
                                  {isSelectionMode ? (<div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${selectedMediaIds.has(item.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-white/20 bg-black/40'}`}>{selectedMediaIds.has(item.id) && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}</div>) : (
                                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all ${mediaData?.id === item.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 group-hover:bg-white/10'}`}>{mediaData?.id === item.id && isPlaying ? (<svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>) : (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>)}</div>
                                  )}
                                  <div className="min-w-0"><h4 className={`text-sm font-black italic tracking-tight uppercase truncate ${mediaData?.id === item.id ? 'text-blue-400' : 'text-slate-200'}`}>{item.name}</h4><div className="flex items-center gap-3 mt-1"><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{(item.size / 1024 / 1024).toFixed(1)} MB</span><span className="text-slate-700">•</span><span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{new Date(item.dateAdded).toLocaleDateString()}</span></div></div>
                              </div>
                              {!isSelectionMode && (<button onClick={(e) => deleteFromVault(item.id, e)} className="p-2 rounded-lg bg-white/0 hover:bg-red-500/10 text-slate-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>)}
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
           <header className="flex justify-between items-center mb-16"><h2 className="text-3xl font-black italic tracking-tighter uppercase text-white">DSP <span className="text-blue-500">Rack</span></h2><button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white transition-colors p-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg></button></header>
           <div className="flex-1 overflow-y-auto pr-4 space-y-16 custom-scroll">
              <section className="space-y-10">
                 <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em]">Engine Clock</h3>
                 <div className="space-y-8">
                   <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Bit Depth Architecture</label>
                     <div className="grid grid-cols-3 gap-3">{BIT_DEPTH_OPTIONS.map(bit => (<button key={bit} onClick={() => setSettings(p => ({ ...p, bitDepth: bit }))} className={`py-4 rounded-xl border font-black text-[11px] transition-all ${settings.bitDepth === bit ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>{bit}-BIT</button>))}</div>
                   </div>
                   <div className="space-y-4">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sample Frequency</label>
                     <div className="grid grid-cols-2 gap-3">{SAMPLE_RATE_MAP[settings.bitDepth].map(freq => (<button key={freq} onClick={() => setSettings(p => ({ ...p, sampleRate: freq }))} className={`py-4 rounded-xl border font-black text-[11px] transition-all ${settings.sampleRate === freq ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>{freq/1000} kHz</button>))}</div>
                   </div>
                 </div>
              </section>
              <section className="space-y-12 pb-20">
                 <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em]">Cinema Presets</h3>
                 <div className="grid grid-cols-2 gap-3">{AUDIO_PRESETS.map(p => (<button key={p} onClick={() => setSettings(s => ({ ...s, selectedPreset: p }))} className={`py-4 px-2 rounded-xl border font-black text-[9px] uppercase tracking-widest transition-all ${settings.selectedPreset === p ? 'bg-blue-600 text-white border-blue-500 shadow-xl' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}>{p}</button>))}</div>
                 <h3 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.4em]">Processing Path</h3>
                 <ControlGroup label="Master Level" value={settings.volume} min={0} max={3} step={0.01} onChange={(v: any) => setSettings(p => ({...p, volume: v}))} suffix="%" displayMult={100} />
                 <ControlGroup label="LFE / Bass" value={settings.bass} min={-10} max={15} step={1} onChange={(v: any) => setSettings(p => ({...p, bass: v}))} suffix="db" />
                 <ControlGroup label="Verticality" value={settings.heightLevel} min={0} max={1} step={0.1} onChange={(v: any) => setSettings(p => ({...p, heightLevel: v}))} suffix="%" displayMult={100} />
                 <ControlGroup label="Ambience / Reverb" value={settings.reverbLevel} min={0} max={1} step={0.05} onChange={(v: any) => setSettings(p => ({...p, reverbLevel: v}))} suffix="" displayMult={100} />
                 <div className="space-y-8 pt-8 border-t border-white/5">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Advanced Calibration</h4>
                   <ControlGroup label="Speaker Delay" value={settings.speakerDelay} min={0} max={100} step={1} onChange={(v: any) => setSettings(p => ({...p, speakerDelay: v}))} suffix="ms" />
                   <ControlGroup label="Phase Alignment" value={settings.phaseAlignment} min={-5} max={5} step={0.1} onChange={(v: any) => setSettings(p => ({...p, phaseAlignment: v}))} suffix="ms" />
                   <ControlGroup label="LFE Crossover" value={settings.lfeCrossover} min={40} max={250} step={5} onChange={(v: any) => setSettings(p => ({...p, lfeCrossover: v}))} suffix="Hz" />
                 </div>
                 <ToggleSwitch label="Theater Mode" enabled={settings.isTheaterMode} onToggle={() => setSettings(p => ({...p, isTheaterMode: !p.isTheaterMode}))} />
                 <ToggleSwitch label="HD Audio (Hi-Res)" enabled={settings.isHdAudioEnabled} onToggle={() => setSettings(p => ({...p, isHdAudioEnabled: !p.isHdAudioEnabled}))} />
                 <ToggleSwitch label="Dolby Vision / HDR" enabled={settings.isDolbyVisionEnabled} onToggle={() => setSettings(p => ({...p, isDolbyVisionEnabled: !p.isDolbyVisionEnabled}))} />
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
    <div className="flex justify-between items-center"><label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label><span className="text-[11px] font-mono text-blue-400 font-black">{Math.round(value * displayMult)}{suffix}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full accent-blue-500 bg-white/5 h-[4px] rounded-full appearance-none cursor-pointer" />
  </div>
);

const ToggleSwitch = ({ label, enabled, onToggle }: any) => (
  <button onClick={onToggle} className="w-full flex items-center justify-between py-6 px-8 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
    <div className={`w-14 h-7 rounded-full relative transition-all duration-300 ${enabled ? 'bg-blue-600 shadow-xl' : 'bg-slate-800'}`}><div className={`absolute top-1 bottom-1 w-5 rounded-full bg-white transition-all ${enabled ? 'left-8' : 'left-1'}`}></div></div>
  </button>
);

export default App;
