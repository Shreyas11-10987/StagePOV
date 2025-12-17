
import React, { useEffect, useRef } from 'react';
import { SpeakerPosition } from '../types';
import { audioEngine } from '../services/audioEngine';

interface ThreeDSpatialViewProps {
  listenerPos: { x: number, y: number };
  headRotation: number;
  isTheaterMode: boolean;
  speakers: SpeakerPosition[];
}

export const ThreeDSpatialView: React.FC<ThreeDSpatialViewProps> = ({ 
  listenerPos, 
  headRotation, 
  isTheaterMode, 
  speakers 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const project = (x: number, y: number, z: number) => {
      const focalLength = 600;
      const scale = focalLength / (focalLength + z * 180 + 350);
      return {
        px: canvas.width / 2 + x * 220 * scale,
        py: canvas.height / 2 + (y * -200) * scale,
        scale
      };
    };

    const drawSpeaker = (s: SpeakerPosition) => {
      const p = project(s.x, s.y, s.z);
      const size = 10 * p.scale;
      const opacity = s.isActive ? 1 : 0.15;
      
      const data = audioEngine.getAnalyserData();
      const intensity = s.isActive ? (data[Math.floor(Math.random() * 32)] / 255) : 0;

      ctx.save();
      ctx.globalAlpha = opacity;
      
      // Speaker Enclosure
      ctx.fillStyle = s.isActive ? '#111115' : '#050508';
      ctx.strokeStyle = s.isActive ? '#3b82f6' : '#1e293b';
      ctx.lineWidth = 1;
      
      const w = size * 1.6;
      const h = size * 2.4;
      ctx.beginPath();
      ctx.roundRect(p.px - w/2, p.py - h/2, w, h, 3);
      ctx.fill();
      ctx.stroke();

      if (s.isActive) {
        // Glowing Driver
        ctx.beginPath();
        ctx.arc(p.px, p.py + size/2, size/1.8 + intensity * 6, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0c';
        ctx.fill();
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 + intensity})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Tweeter
        ctx.beginPath();
        ctx.arc(p.px, p.py - size/1.6, size/3, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
      }

      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Floor Grid
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.08)';
      ctx.lineWidth = 1;
      for (let i = -5; i <= 5; i++) {
        const p1 = project(-5, -1, i);
        const p2 = project(5, -1, i);
        ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py); ctx.stroke();
        const p3 = project(i, -1, -5);
        const p4 = project(i, -1, 5);
        ctx.beginPath(); ctx.moveTo(p3.px, p3.py); ctx.lineTo(p4.px, p4.py); ctx.stroke();
      }

      // Speakers
      speakers.forEach(s => drawSpeaker(s));

      // Listener (Head)
      const l = project(listenerPos.x, 0, 0); // Listener locked at center
      ctx.save();
      ctx.translate(l.px, l.py);
      ctx.rotate((headRotation * Math.PI) / 180);
      
      // Minimalist Head Shape
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(0, 0, 15 * l.scale, 18 * l.scale, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Face indicator
      ctx.fillStyle = '#020205';
      ctx.fillRect(-8 * l.scale, -12 * l.scale, 6 * l.scale, 2 * l.scale);
      ctx.fillRect(2 * l.scale, -12 * l.scale, 6 * l.scale, 2 * l.scale);

      // Listener orientation cone
      const grad = ctx.createLinearGradient(0, 0, 0, -60 * l.scale);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-12 * l.scale, -14 * l.scale);
      ctx.lineTo(0, -60 * l.scale);
      ctx.lineTo(12 * l.scale, -14 * l.scale);
      ctx.fill();
      
      ctx.restore();

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [listenerPos, headRotation, isTheaterMode, speakers]);

  return (
    <div className="relative w-full aspect-video glass rounded-[3rem] overflow-hidden border border-white/5 bg-[#050508] shadow-inner">
      <div className="absolute top-8 left-10 z-10 space-y-1">
        <h3 className="text-[10px] font-black text-blue-500 tracking-[0.4em] uppercase">Cinema Soundstage</h3>
        <p className="text-[8px] text-white/20 font-mono">OBJECT_ENGINE: v5.0_BETA</p>
      </div>
      <canvas ref={canvasRef} width={1200} height={675} className="w-full h-full" />
      <div className="absolute bottom-8 right-10 flex gap-6 text-[8px] font-mono text-white/20 uppercase tracking-widest">
        <span>Active: {speakers.filter(s => s.isActive).length}</span>
        <span>Mode: Binaural</span>
      </div>
    </div>
  );
};
