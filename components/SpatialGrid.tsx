
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

  const handleDragStart = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setDraggingId(id);
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!draggingId || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 4 - 2;
      const z = ((clientY - rect.top) / rect.height) * -4 + 2;
      onSpeakerMove(draggingId, Math.max(-2, Math.min(2, x)), Math.max(-2, Math.min(2, z)));
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault(); // Prevent scrolling while dragging
      }
    };

    const handleEnd = () => setDraggingId(null);

    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [draggingId, onSpeakerMove]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-square max-w-[280px] bg-black/40 rounded-3xl p-6 flex items-center justify-center mx-auto border border-white/5 overflow-hidden touch-none"
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
          onMouseDown={(e) => handleDragStart(speaker.id, e)}
          onTouchStart={(e) => handleDragStart(speaker.id, e)}
          onDoubleClick={() => onToggleSpeaker(speaker.id)}
        >
          <div className={`w-5 h-5 md:w-4 md:h-4 rounded-full border-2 shadow-lg transition-all ${
            speaker.isActive 
              ? 'bg-blue-500 border-white shadow-blue-500/40' 
              : 'bg-slate-800 border-slate-700 shadow-none grayscale opacity-40'
          }`} />
          <span className="text-[7px] md:text-[8px] font-black text-white/40 tracking-tighter uppercase">{speaker.id}</span>
        </div>
      ))}

      {/* Listener (Center) */}
      <div className="absolute w-8 h-8 flex items-center justify-center pointer-events-none">
        <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_15px_white] animate-pulse" />
      </div>
    </div>
  );
};
