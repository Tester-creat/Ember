import { useEffect, useRef } from 'react';

/**
 * Updates the DOM directly so measuring FPS never triggers a React root re-render.
 */
export default function PerformanceHud() {
  const ref = useRef(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let frames = 0;
    let last = performance.now();
    let longTasks = 0;
    let obs;

    if (typeof PerformanceObserver !== 'undefined') {
      try {
        obs = new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.duration > 50) longTasks++;
          }
        });
        obs.observe({ type: 'longtask', buffered: true });
      } catch {
        /* unsupported */
      }
    }

    const tick = (t) => {
      frames++;
      if (t - last >= 1000) {
        const fps = Math.round((frames * 1000) / (t - last));
        frames = 0;
        last = t;
        const imgs = document.images?.length ?? 0;
        const longSnap = longTasks;
        longTasks = 0;
        const fpsColor = fps < 30 ? '#ff4d4d' : '#4dff4d';
        el.style.color = fpsColor;
        el.textContent = `FPS ${fps} · img ${imgs}${longSnap ? ` · longTask ${longSnap}` : ''}`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      obs?.disconnect();
    };
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div
      ref={ref}
      className="perf-stats"
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(10px)',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        zIndex: 9999,
        pointerEvents: 'none',
        fontFamily: 'monospace',
        opacity: 0.65,
      }}
      aria-hidden="true"
    />
  );
}
