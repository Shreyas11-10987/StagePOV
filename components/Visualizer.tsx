
import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

export const Visualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peaksRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      const data = audioEngine.getAnalyserData();
      if (peaksRef.current.length !== data.length) {
        peaksRef.current = new Array(data.length).fill(0);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / data.length) * 2;
      let x = 0;

      for (let i = 0; i < data.length; i++) {
        const val = data[i] / 255;
        const barHeight = val * canvas.height;
        
        // Update peaks with "gravity"
        if (val > peaksRef.current[i]) {
          peaksRef.current[i] = val;
        } else {
          peaksRef.current[i] -= 0.005; // Peak fall speed
        }
        
        const peakHeight = peaksRef.current[i] * canvas.height;

        // Draw Peak indicator line
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.fillRect(x, canvas.height - peakHeight - 1, barWidth - 1, 1);

        // Draw Main Bar Gradient
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.1)');
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.6)');
        gradient.addColorStop(1, '#60a5fa');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        
        // Glow effect for high intensities
        if (val > 0.8) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#60a5fa';
          ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, 2);
          ctx.shadowBlur = 0;
        }

        x += barWidth;
      }
      
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="w-full h-32 bg-black/40 rounded-2xl overflow-hidden border border-white/5 group relative">
      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <canvas ref={canvasRef} width={600} height={128} className="w-full h-full" />
    </div>
  );
};
