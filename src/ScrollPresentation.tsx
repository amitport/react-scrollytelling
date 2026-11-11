import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMotionValue, type MotionValue } from 'framer-motion';
import { MathTex } from './MathTex.js';

export interface ScrollChapter {
  id: string;
  stepNum: string;
  shortLabel: string;
  tag: string;
  title: ReactNode;
  equationTex?: string;
  lead: ReactNode;
  bullets: readonly { label: ReactNode; text?: ReactNode }[];
  insight?: ReactNode;
}

export interface ScrollVisualState {
  scrollYProgress: MotionValue<number>;
  activeChapter: number;
}

export interface ScrollPresentationProps {
  title: string;
  brand: string;
  subtitle: string;
  chapters: readonly ScrollChapter[];
  overview: (goToChapter: (index: number) => void) => ReactNode;
  renderVisual: (state: ScrollVisualState) => ReactNode;
  afterword?: ReactNode;
  sectionLinks?: readonly { id: string; label: string }[];
}

const noSectionLinks: NonNullable<ScrollPresentationProps['sectionLinks']> = [];

function stickyTop(track: HTMLElement) {
  const card = track.firstElementChild;
  if (!card) throw new Error('Presentation chapter is missing its narrative card.');
  const top = Number.parseFloat(window.getComputedStyle(card).top);
  if (!Number.isFinite(top)) throw new Error('Presentation chapter needs a numeric sticky offset.');
  return top;
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
}

export function ScrollPresentation({
  title, brand, subtitle, chapters, overview, renderVisual, afterword, sectionLinks = noSectionLinks,
}: ScrollPresentationProps) {
  if (!chapters.length || new Set(chapters.map(chapter => chapter.id)).size !== chapters.length || chapters.some(chapter => !chapter.id)) {
    throw new RangeError('Scroll presentations need at least one chapter with nonempty, unique IDs.');
  }
  const pageRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const scrollYProgress = useMotionValue(0);
  const [activeChapter, setActiveChapter] = useState(0);
  const [isAtOverview, setIsAtOverview] = useState(true);
  const [activeSection, setActiveSection] = useState<string>();

  useEffect(() => {
    document.title = title;
    const updateProgress = () => {
      const tracks = workspaceRef.current?.querySelectorAll<HTMLElement>('.scrolly-chapter-track');
      if (!tracks?.length) return;
      const first = tracks[0].getBoundingClientRect();
      if (first.height <= 0) return;
      const distance = stickyTop(tracks[0]) - first.top;
      setIsAtOverview(distance < -60);
      const section = sectionLinks.filter(link => {
        const element = pageRef.current?.querySelector<HTMLElement>(`#${CSS.escape(link.id)}`);
        if (!element) return false;
        const bounds = element.getBoundingClientRect();
        const headerBottom = (headerRef.current?.getBoundingClientRect().height ?? 0) + 13;
        const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
        // A short afterword cannot always reach the sticky header before scrolling ends.
        return bounds.top <= headerBottom || (atPageEnd && bounds.top < window.innerHeight && bounds.bottom > headerBottom);
      }).at(-1);
      setActiveSection(section?.id);
      const progress = Math.max(0, Math.min(1, distance / (first.height * tracks.length)));
      scrollYProgress.set(progress);
      setActiveChapter(Math.min(tracks.length - 1, Math.floor(progress * tracks.length)));
    };
    const updateHeader = () => {
      if (headerRef.current) {
        pageRef.current?.style.setProperty('--scrolly-sticky-top', `${headerRef.current.getBoundingClientRect().height + 12}px`);
      }
      updateProgress();
    };
    const observer = new ResizeObserver(updateHeader);
    if (headerRef.current) observer.observe(headerRef.current);
    updateHeader();
    let disposed = false;
    let anchorFrame = 0;
    const restoreSectionAnchor = () => {
      const link = sectionLinks.find(item => `#${item.id}` === window.location.hash);
      if (!link) return;
      void document.fonts.ready.then(() => {
        if (disposed || window.location.hash !== `#${link.id}`) return;
        cancelAnimationFrame(anchorFrame);
        anchorFrame = requestAnimationFrame(() => {
          pageRef.current?.querySelector<HTMLElement>(`#${CSS.escape(link.id)}`)?.scrollIntoView({ behavior: 'instant' });
          updateProgress();
        });
      });
    };
    if (document.readyState === 'complete') restoreSectionAnchor();
    window.addEventListener('load', restoreSectionAnchor);
    window.addEventListener('hashchange', restoreSectionAnchor);
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateHeader);
    return () => {
      disposed = true;
      cancelAnimationFrame(anchorFrame);
      observer.disconnect();
      window.removeEventListener('load', restoreSectionAnchor);
      window.removeEventListener('hashchange', restoreSectionAnchor);
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateHeader);
    };
  }, [title, chapters.length, sectionLinks, scrollYProgress]);

  const clearHash = () => window.history.replaceState(null, '', window.location.pathname + window.location.search);
  const goToChapter = (index: number) => {
    const tracks = workspaceRef.current?.querySelectorAll<HTMLElement>('.scrolly-chapter-track');
    if (!Number.isInteger(index) || !tracks?.[index]) throw new RangeError('Chapter index is out of range.');
    const first = tracks[0].getBoundingClientRect();
    // The midpoint reveals the chapter's staged animation while its card is pinned.
    const top = first.top + window.scrollY - stickyTop(tracks[0]) + (index + 0.55) * first.height;
    clearHash();
    window.scrollTo({ top: Math.max(0, top), behavior: scrollBehavior() });
  };

  return <div ref={pageRef} className="scrolly-page">
    <header ref={headerRef} className="scrolly-topbar">
      <button type="button" className="scrolly-topbar-left scrolly-topbar-brand-btn" title="Scroll to Abstract & Paper Overview" onClick={() => {
        clearHash();
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
      }}>
        <span className={`scrolly-brand-pill ${isAtOverview ? 'is-active' : ''}`}>{brand}</span>
        <span className="scrolly-brand-title">{subtitle}</span>
      </button>
      <nav className="scrolly-stage-track" aria-label="Scroll progress chapters">
        {chapters.map((chapter, index) => {
          const current = !isAtOverview && !activeSection && activeChapter === index;
          return <button key={chapter.id} type="button" onClick={() => goToChapter(index)}
            aria-current={current ? 'step' : undefined}
            className={`scrolly-stage-dot ${current ? 'is-active' : ''} ${!isAtOverview && activeChapter > index ? 'is-past' : ''}`}>
            <span className="scrolly-stage-num">{chapter.stepNum}</span>
            <span className="scrolly-stage-short">{chapter.shortLabel}</span>
          </button>;
        })}
        {sectionLinks.map(link => <a key={link.id} className={`scrolly-stage-dot ${activeSection === link.id ? 'is-active' : ''}`}
          aria-current={activeSection === link.id ? 'location' : undefined} href={`#${link.id}`}>{link.label}</a>)}
      </nav>
    </header>
    {overview(goToChapter)}
    <main ref={workspaceRef} className="scrolly-workspace">
      <div className="scrolly-narrative-col">
        {chapters.map((chapter, index) => <div key={chapter.id} className="scrolly-chapter-track" data-chapter-track={index}>
          <article className={`scrolly-chapter-card ${activeChapter === index ? 'is-current' : ''}`} data-chapter={index}>
            <div className="scrolly-chapter-tag">STAGE {chapter.stepNum} · {chapter.tag}</div>
            <h2 className="scrolly-chapter-title">{chapter.title}</h2>
            {chapter.equationTex && <div className="scrolly-chapter-equation"><MathTex tex={chapter.equationTex} display /></div>}
            <p className="scrolly-chapter-lead">{chapter.lead}</p>
            <ul className="scrolly-chapter-list">{chapter.bullets.map((bullet, i) => <li key={i}>
              {bullet.text ? <><strong>{bullet.label}:</strong> {bullet.text}</> : <strong>{bullet.label}</strong>}
            </li>)}</ul>
            {chapter.insight && <div className="scrolly-chapter-insight"><div className="scrolly-chapter-insight-math">{chapter.insight}</div></div>}
          </article>
        </div>)}
      </div>
      <div className="scrolly-canvas-col"><div className="scrolly-sticky-stage">
        {renderVisual({ scrollYProgress, activeChapter })}
      </div></div>
    </main>
    {afterword}
  </div>;
}
