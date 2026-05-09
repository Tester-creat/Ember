
import { useState, useEffect, useRef } from 'react';

export function usePerformanceMonitor() {
  const [fps, setFps] = useState(60);
  const [renderCount, setRenderCount] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let requestRef;
    const loop = (time) => {
      frameCountRef.current++;
      if (time - lastTimeRef.current > 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (time - lastTimeRef.current)));
        frameCountRef.current = 0;
        lastTimeRef.current = time;
      }
      requestRef = requestAnimationFrame(loop);
    };
    requestRef = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef);
  }, []);

  useEffect(() => {
    setRenderCount(c => c + 1);
  }, []); // Tracks initial mount, could be extended

  return { fps, renderCount };
}
