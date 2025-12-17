
import React, { useState, useRef, useEffect } from 'react';
import { SpeakerPosition } from '../types';

interface SpatialGridProps {
  onToggleSpeaker: (id: string) => void;
  onSpeakerMove: (id: string, x: number, z: number) => void;
  speakers: SpeakerPosition[];
}

export const SpatialGrid: React.FC<SpatialGridProps> = ({ 
  onToggleSpeaker, 
  onSpeakerMove, 
  speakers 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingId(id);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingId || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 4 - 2;
      const z = ((e.clientY - rect.top) / rect.height) * -4 + 2;
      onSpeakerMove(draggingId, Math.max(-2, Math.min(2, x)), Math.max(-2, Math.min(2, z)));
    };

    const handleMouseUp = () => setDraggingId(null);

    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, onSpeakerMove]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-square max-w-[280px] bg-black/40 rounded-3xl p-6 flex items-center justify-center mx-auto border border-white/5 overflow-hidden"
    >
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10 pointer-events-none">
        {[...Array(36)].map((_, i) => (
          <div key={i} className="border border-blue-500/30" />
        ))}
      </div>

      {/* Axis Lines */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-white/5" />
      <div className="absolute left-1/2 top-0 w-px h-full bg-white/5" />

      {/* Speakers */}
      {speakers.map((speaker) => (
        <div
          key={speaker.id}
          className={`absolute flex flex-col items-center gap-1 transition-transform cursor-grab active:cursor-grabbing ${draggingId === speaker.id ? 'z-20 scale-125' : 'z-10'}`}
          style={{
            left: `${(speaker.x + 2) * 25}%`,
            top: `${(speaker.z * -1 + 2) * 25}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={(e) => handleMouseDown(speaker.id, e)}
          onDoubleClick={() => onToggleSpeaker(speaker.id)}
        >
          <div className={`w-4 h-4 rounded-full border-2 shadow-lg transition-all ${
            speaker.isActive 
              ? 'bg-blue-500 border-white shadow-blue-500/40' 
              : 'bg-slate-800 border-slate-700 shadow-none grayscale opacity-40'
          }`} />
          <span className="text-[8px] font-black text-white/40 tracking-tighter uppercase">{speaker.id}</span>
        </div>
      ))}

      {/* Locked Listener (Center) */}
      <div className="absolute w-8 h-8 flex items-center justify-center pointer-events-none">
        <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_15px_white] animate-pulse" />
        <div className="absolute w-full h-full border-2 border-white/10 rounded-full scale-150 opacity-20" />
      </div>

      <div className="absolute bottom-3 right-4 text-[7px] font-mono text-white/20 uppercase tracking-[0.2em]">
        Interactive Object Field
      </div>
    </div>
  );
};
