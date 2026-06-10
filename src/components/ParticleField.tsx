import {FC, memo, useEffect, useRef} from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const LINK_DISTANCE = 110;
const POINTER_DISTANCE = 170;
const MAX_DPR = 1.5;
// Ignore tiny height-only resizes (mobile URL-bar show/hide) so we don't
// re-seed the whole field mid-scroll.
const RESIZE_HEIGHT_THRESHOLD = 120;

/**
 * A lightweight canvas "neural network" particle field: drifting nodes that
 * link to each other and reach toward the cursor. Disabled entirely under
 * prefers-reduced-motion. Pointer-events are never captured.
 */
const ParticleField: FC<{className?: string}> = memo(({className}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let particles: Particle[] = [];
    let frame: number | undefined;
    let lastWidth = 0;
    let lastHeight = 0;
    // Pause gating: the loop only runs when both visible (tab + on-screen).
    let documentVisible = !document.hidden;
    let onScreen = true;
    const pointer = {active: false, x: 0, y: 0};
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    const applyCanvasSize = (width: number, height: number) => {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = (width: number, height: number) => {
      const count = Math.min(90, Math.floor(width / 16));
      particles = Array.from({length: count}, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      }));
    };

    const resize = () => {
      const {width, height} = canvas.getBoundingClientRect();
      const widthChanged = width !== lastWidth;
      const heightDelta = Math.abs(height - lastHeight);
      // Skip small height-only changes (mobile URL-bar) to avoid re-seeding.
      if (!widthChanged && heightDelta < RESIZE_HEIGHT_THRESHOLD && lastWidth !== 0) {
        return;
      }
      applyCanvasSize(width, height);
      // Re-seed only when the width changes; otherwise keep existing particles
      // and just rescale them into the new height.
      if (widthChanged || lastWidth === 0) {
        seed(width, height);
      } else if (lastHeight > 0) {
        const scaleY = height / lastHeight;
        for (const particle of particles) {
          particle.y *= scaleY;
        }
      }
      lastWidth = width;
      lastHeight = height;
    };

    const isRunning = () => frame !== undefined;
    const start = () => {
      if (!isRunning() && documentVisible && onScreen) {
        frame = requestAnimationFrame(step);
      }
    };
    const stop = () => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
        frame = undefined;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.active = true;
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointer.active = false;
    };

    const step = () => {
      const {width, height} = canvas.getBoundingClientRect();
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < 0 || particle.x > width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > height) particle.vy *= -1;
      }

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance < LINK_DISTANCE) {
            context.strokeStyle = `rgba(251, 146, 60, ${0.16 * (1 - distance / LINK_DISTANCE)})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(b.x, b.y);
            context.stroke();
          }
        }

        if (pointer.active) {
          const dx = a.x - pointer.x;
          const dy = a.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < POINTER_DISTANCE) {
            context.strokeStyle = `rgba(251, 146, 60, ${0.35 * (1 - distance / POINTER_DISTANCE)})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(a.x, a.y);
            context.lineTo(pointer.x, pointer.y);
            context.stroke();
          }
        }

        context.fillStyle = 'rgba(255, 255, 255, 0.45)';
        context.beginPath();
        context.arc(a.x, a.y, 1.2, 0, Math.PI * 2);
        context.fill();
      }

      frame = requestAnimationFrame(step);
    };

    const onVisibilityChange = () => {
      documentVisible = !document.hidden;
      documentVisible ? start() : stop();
    };
    const observer = new IntersectionObserver(entries => {
      onScreen = entries[0]?.isIntersecting ?? true;
      onScreen ? start() : stop();
    });

    resize();
    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);
    start();
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return <canvas aria-hidden="true" className={className} ref={canvasRef} />;
});

ParticleField.displayName = 'ParticleField';
export default ParticleField;
