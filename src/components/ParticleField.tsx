import {FC, memo, useEffect, useRef} from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const LINK_DISTANCE = 110;
const POINTER_DISTANCE = 170;

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
    let frame = 0;
    const pointer = {active: false, x: 0, y: 0};

    const resize = () => {
      const {width, height} = canvas.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      const count = Math.min(90, Math.floor(width / 16));
      particles = Array.from({length: count}, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      }));
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

    resize();
    frame = requestAnimationFrame(step);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerleave', onPointerLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return <canvas aria-hidden="true" className={className} ref={canvasRef} />;
});

ParticleField.displayName = 'ParticleField';
export default ParticleField;
