import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, useReducedMotion, useTransform } from 'framer-motion';
import {
  ScrollPresentation, ScrollCanvas, ScrollScene, useChapterProgress, MathTex, SvgMath,
  type ScrollChapter, type ScrollVisualState,
} from '@amitport/react-scrollytelling';
import '@amitport/react-scrollytelling/styles.css';

const chapters: ScrollChapter[] = [
  {
    id: 'map', stepNum: '01', shortLabel: 'Linear map', tag: 'GEOMETRY',
    title: 'See a linear map',
    equationTex: 'y=Wx,\\quad W=\\operatorname{diag}(2,0.5)',
    lead: 'A matrix can stretch one input direction and compress another.',
    bullets: [{ label: 'Scroll', text: 'Watch the circle become an ellipse while this card stays pinned.' }],
    insight: 'Synthetic geometry, not model measurements.',
  },
  {
    id: 'limits', stepNum: '02', shortLabel: 'Interpret', tag: 'INTERPRETATION',
    title: 'Connect the picture to the claim',
    equationTex: '\\|Wx\\|_2\\leq\\|W\\|_2\\|x\\|_2',
    lead: 'The largest singular value bounds the stretch of a linear map.',
    bullets: [
      { label: 'Separate claims', text: 'An algebraic property does not establish a model accuracy or latency result.' },
      { label: 'Bring your own visual', text: 'The shared canvas accepts your SVG or React content.' },
    ],
    insight: <MathTex tex="\|W\|_2=2" />,
  },
];
const sectionLinks = [{ id: 'sources', label: 'Sources' }];

function Canvas({ scrollYProgress, activeChapter }: ScrollVisualState) {
  const local = useChapterProgress(scrollYProgress, 0, chapters.length);
  const reduced = useReducedMotion();
  const reveal = useTransform(local, value => reduced ? 1 : Math.min(1, value / 0.5));
  const rx = useTransform(reveal, [0, 1], [70, 140]);
  const ry = useTransform(reveal, [0, 1], [70, 35]);
  return <ScrollCanvas title={`${chapters[activeChapter].stepNum} · ${chapters[activeChapter].tag}`} equation={chapters[activeChapter].equationTex}>
    <svg className="scrolly-main-svg" viewBox="0 0 640 360" role="img" aria-label="Synthetic linear-map illustration">
      <ScrollScene progress={scrollYProgress} index={0} count={chapters.length} activeChapter={activeChapter}>
        <path d="M140 170H500M320 65V275" stroke="#cbd5e1" />
        <motion.ellipse data-ellipse cx="320" cy="170" rx={rx} ry={ry} fill="#ccfbf1" stroke="#0d9488" strokeWidth="3" />
        <SvgMath x={80} y={285} width={480} height={50} tex="(x_1,x_2)\mapsto(2x_1,\,0.5x_2)" fontSize={26} />
      </ScrollScene>
      <ScrollScene progress={scrollYProgress} index={1} count={chapters.length} activeChapter={activeChapter}>
        <rect x="70" y="65" width="500" height="230" rx="18" fill="#eff6ff" stroke="#93c5fd" />
        <text x="320" y="130" textAnchor="middle" fill="#1e293b" fontSize="28">Maximum stretch: 2</text>
        <SvgMath x={80} y={165} width={480} height={65} tex="\sigma_{\max}(W)=2" fontSize={30} />
        <text x="320" y="265" textAnchor="middle" fill="#475569" fontSize="22">A mathematical bound, not a benchmark.</text>
      </ScrollScene>
    </svg>
  </ScrollCanvas>;
}

createRoot(document.getElementById('root')!).render(<StrictMode>
  <ScrollPresentation title="Scrollytelling example" brand="SCROLLYTELLING" subtitle="From a visual to a claim"
    chapters={chapters} sectionLinks={sectionLinks} renderVisual={state => <Canvas {...state} />}
    overview={goToChapter => <section className="scrolly-abstract-header">
      <div className="scrolly-abstract-card">
        <h1 className="scrolly-abstract-title">Explain an idea as the reader scrolls</h1>
        <p className="scrolly-abstract-body">A pinned narrative, one shared visual canvas, and continuous scroll-driven progress. This example imports the installed package, not its source.</p>
        <button className="scrolly-abstract-jump-btn" onClick={() => goToChapter(0)}>Start walkthrough</button>
      </div>
    </section>}
    afterword={<section id="sources" className="scrolly-abstract-header" style={{ scrollMarginTop: 'var(--scrolly-sticky-top, 68px)' }}>
      <div className="scrolly-abstract-card">
        <h2 className="scrolly-chapter-title">Sources and limitations</h2>
        <p className="scrolly-abstract-body">These are synthetic teaching examples. Replace them with your own content, citations, and evidence.</p>
      </div>
    </section>}
  />
</StrictMode>);
