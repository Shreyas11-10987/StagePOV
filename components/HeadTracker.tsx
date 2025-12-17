
import React, { useEffect, useRef, useState } from 'react';

interface HeadTrackerProps {
  onRotate: (angle: number) => void;
  enabled: boolean;
}

export const HeadTracker: React.FC<HeadTrackerProps> = ({ onRotate, enabled }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsReady(true);
        }
      })
      .catch(err => console.error("Camera access denied", err));

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isReady) return;

    let animId: number;
    const ctx = canvasRef.current?.getContext('2d');
    
    const track = () => {
      if (videoRef.current && canvasRef.current && ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Simplified "Face Tracking" - we look for the brightest/largest mass in center
        // In a real app we'd use MediaPipe. Here we simulate basic movement.
        const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
        let centerX = 0;
        let count = 0;
        for (let i = 0; i < imageData.data.length; i += 4 * 10) {
          const r = imageData.data[i];
          const g = imageData.data[i+1];
          const b = imageData.data[i+2];
          const brightness = (r + g + b) / 3;
          if (brightness > 150) {
             const x = (i / 4) % canvasRef.current.width;
             centerX += x;
             count++;
          }
        }
        
        if (count > 0) {
          const avgX = centerX / count;
          const normalized = (avgX / canvasRef.current.width) * 2 - 1;
          onRotate(normalized * -45); // Map to +/- 45 degrees
        }
      }
      animId = requestAnimationFrame(track);
    };

    track();
    return () => cancelAnimationFrame(animId);
  }, [enabled, isReady, onRotate]);

  return (
    <div className={`relative rounded-xl overflow-hidden border border-blue-500/30 transition-all ${enabled ? 'w-32 h-24 opacity-100' : 'w-0 h-0 opacity-0'}`}>
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
      <canvas ref={canvasRef} width={80} height={60} className="hidden" />
      <div className="absolute inset-0 border-2 border-blue-400/50 rounded-lg animate-pulse pointer-events-none" />
      <div className="absolute bottom-1 right-1 bg-black/60 px-1 rounded text-[8px] font-mono text-blue-400">TRK_LIVE</div>
    </div>
  );
};
