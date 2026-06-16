import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export default function AudioVisualizer({ isPlaying, audioRef }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let resizeObserver: ResizeObserver | null = null;
    
    const handleResize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = canvas.parentElement?.clientHeight || 80;
    };

    if (canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(canvas.parentElement);
    }
    handleResize();

    let phase = 0;
    const barsCount = 36;
    const barHeights = Array(barsCount).fill(4);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;

      // Create beautiful dark backing glow
      ctx.fillStyle = 'rgba(9, 9, 11, 0.2)';
      ctx.fillRect(0, 0, width, height);

      phase += 0.08;

      const barWidth = (width / barsCount) - 3;
      const spacer = 3;

      // Draw active bouncing audio frequency bars
      for (let i = 0; i < barsCount; i++) {
        // Multi-frequency wave generation
        let targetHeight = 4;
        if (isPlaying) {
          const sineFactor = Math.sin(phase + i * 0.2) * 0.4 + 0.6;
          const noiseFactor = Math.cos(phase * 1.5 - i * 0.4) * 0.3 + 0.7;
          
          // Outer frequencies are lower, mid frequencies are bouncy, low-mid (bass) are deep
          const frequencyWeight = Math.sin((i / barsCount) * Math.PI);
          targetHeight = 4 + (frequencyWeight * (height - 12) * sineFactor * noiseFactor);
        } else {
          // Flatten elegantly when paused
          targetHeight = 4;
        }

        // Apply smooth interpolation
        barHeights[i] = barHeights[i] * 0.7 + targetHeight * 0.3;

        const x = i * (barWidth + spacer);
        const y = height - barHeights[i];

        // Beautiful dual-color Spotify gradient: #1ed760 to emerald
        const prg = i / barsCount;
        const colorGrad = ctx.createLinearGradient(x, y, x, height);
        colorGrad.addColorStop(0, '#1ed760');
        colorGrad.addColorStop(0.5, '#10b981');
        colorGrad.addColorStop(1, '#064e3b');

        ctx.fillStyle = colorGrad;
        
        // Draw rounded rectangle bars
        const r = 3; // rounded corner radius
        ctx.beginPath();
        if (canvas.width > 0 && canvas.height > 0) {
          ctx.roundRect(x, y, barWidth, barHeights[i], r);
        } else {
          ctx.rect(x, y, barWidth, barHeights[i]);
        }
        ctx.fill();
      }

      // Draw subtle overlapping ambient glowing audio wave at the bottom
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(30, 215, 96, 0.4)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < width; x += 5) {
        let waveY = height - 10;
        if (isPlaying) {
          waveY -= Math.sin(phase + x * 0.02) * 6 * Math.sin(phase * 0.5);
        }
        if (x === 0) {
          ctx.moveTo(x, waveY);
        } else {
          ctx.lineTo(x, waveY);
        }
      }
      ctx.stroke();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [isPlaying, audioRef]);

  return (
    <div id="visualizer-container" className="w-full h-14 relative overflow-hidden rounded-md bg-zinc-950/40 border border-zinc-800/50 flex items-center">
      <canvas id="visualizer-canvas" ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute top-2 left-3 flex items-center gap-1.5 z-10 pointers-none">
        <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-green-500 animate-ping' : 'bg-zinc-650'}`} />
        <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Live Frequency visualizer</span>
      </div>
    </div>
  );
}
