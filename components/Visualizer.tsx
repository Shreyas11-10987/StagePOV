
import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

export const Visualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const data = audioEngine.getAnalyserData();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / data.length) * 2.5;
      let x = 0;

      for (let i = 0; i < data.length; i++) {
        const barHeight = (data[i] / 255) * canvas.height;
        
        // Gradient for a "Dolby" feel
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#3b82f6');
        gradient.addColorStop(1, '#60a5fa');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
      }
      
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="w-full h-24 bg-black/20 rounded-lg overflow-hidden border border-white/5">
      <canvas ref={canvasRef} width={600} height={100} className="w-full h-full" />
    </div>
  );
};
