import type { ReactNode } from 'react';
import { motion, useReducedMotion, useTransform, type MotionValue } from 'framer-motion';
import { MathTex } from './MathTex.js';

export function ScrollCanvas({ title, equation, note, children }: {
  title: ReactNode; equation?: string; note?: ReactNode; children: ReactNode;
}) {
  return <div className="scrolly-canvas-card">
    <div className={`scrolly-canvas-topbar${note ? ' scrolly-canvas-topbar--stacked' : ''}`}>
      <div className="scrolly-canvas-stage-tag">{title}</div>
      {equation && <div className="scrolly-canvas-formula-pill"><MathTex tex={equation} /></div>}
      {note && <p className="scrolly-canvas-note">{note}</p>}
    </div>
    <div className="scrolly-svg-container">{children}</div>
  </div>;
}

export function useChapterProgress(progress: MotionValue<number>, index: number, count: number) {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError('Chapter progress needs a valid index and positive chapter count.');
  }
  return useTransform(progress, value => Math.max(0, Math.min(1, value * count - index)));
}

export function ScrollScene({ progress, index, count, activeChapter, children }: {
  progress: MotionValue<number>; index: number; count: number; activeChapter: number; children: ReactNode;
}) {
  const localProgress = useChapterProgress(progress, index, count);
  const reducedMotion = useReducedMotion();
  const opacity = useTransform(localProgress, [0, 0.12, 0.72, 0.92, 1], [index === 0 ? 1 : 0, 1, 1, index === count - 1 ? 1 : 0, index === count - 1 ? 1 : 0]);
  if (reducedMotion) return <g data-scroll-scene={index} aria-hidden={activeChapter !== index}
    style={{ opacity: Number(activeChapter === index), pointerEvents: activeChapter === index ? 'auto' : 'none' }}>{children}</g>;
  return <motion.g data-scroll-scene={index} aria-hidden={activeChapter !== index}
    style={{ opacity }} pointerEvents={activeChapter === index ? 'auto' : 'none'}>
    {children}
  </motion.g>;
}
