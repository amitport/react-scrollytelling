# @amitport/react-scrollytelling

React components for scroll-driven explanations: pinned narrative cards, a
shared visual canvas, chapter navigation, and mathematical typesetting.
Content and visual scenes belong to your application, not this package.

**Source-available, all rights reserved.** Public visibility does not grant
permission to use, modify, or redistribute this code. See [LICENSE](LICENSE).

## Install

With permission from the copyright holder:

```sh
npm install @amitport/react-scrollytelling react framer-motion
```

The initial release targets React 19, Framer Motion 14, modern browsers, and
ES-module bundlers. This is a full-page browser component; mount one scroll
presentation at a time. Server-component frameworks require a client boundary.
No CommonJS or server-rendering compatibility is claimed.

Import the styles once. KaTeX styles and embedded fonts are included, so there
is no runtime font CDN dependency:

```tsx
import {
  ScrollPresentation,
  ScrollCanvas,
  type ScrollChapter,
} from '@amitport/react-scrollytelling';
import '@amitport/react-scrollytelling/styles.css';

const chapters: ScrollChapter[] = [{
  id: 'idea',
  stepNum: '01',
  shortLabel: 'The idea',
  tag: 'INTRODUCTION',
  title: 'Explain one idea',
  equationTex: 'y=Wx',
  lead: 'Start with the claim and the assumptions.',
  bullets: [{ label: 'Evidence', text: 'Separate illustrations from measurements.' }],
}];

export default function App() {
  return <ScrollPresentation
    title="My explanation"
    brand="EXPLAIN"
    subtitle="An illustrated walkthrough"
    chapters={chapters}
    overview={goToChapter => (
      <section className="scrolly-abstract-header">
        <div className="scrolly-abstract-card">
          <h1 className="scrolly-abstract-title">My explanation</h1>
          <button onClick={() => goToChapter(0)}>Start</button>
        </div>
      </section>
    )}
    renderVisual={({ activeChapter }) => (
      <ScrollCanvas title={chapters[activeChapter].shortLabel}>
        <svg className="scrolly-main-svg" viewBox="0 0 640 360">
          <circle cx="320" cy="180" r="80" fill="#dbeafe" />
        </svg>
      </ScrollCanvas>
    )}
  />;
}
```

The host should set `body { margin: 0; }`. The stylesheet uses the neutral
`scrolly-*` namespace, including `--scrolly-sticky-top`, and does not reset
the host's global body styles.

## API

- **`ScrollPresentation`** accepts `title`, `brand`, `subtitle`, `chapters`,
  `overview(goToChapter)`, and `renderVisual(state)`. Optional `afterword` and
  `sectionLinks: { id, label }[]` link to matching element IDs in the afterword.
  Rich narrative fields accept React nodes. Chapter IDs must be unique and
  nonempty, and at least one chapter is required.
- **`ScrollVisualState`** supplies `activeChapter` and a continuous
  `scrollYProgress: MotionValue<number>` from zero to one.
- **`ScrollCanvas`** supplies the visual frame, `title`, optional `equation`
  and `note`. Put SVG or other React content in its children.
- **`useChapterProgress(progress, index, count)`** maps overall progress to
  a clamped zero-to-one motion value for one chapter. Use `useTransform`
  inside your own component to animate sizes, positions, and opacity.
- **`ScrollScene`** wraps SVG content in a fading group. Pass `progress`,
  `index`, `count`, and `activeChapter`. Inactive scenes are hidden from
  assistive technology; reduced motion switches visibility immediately.
  Prefer non-interactive SVG scenes; do not put focusable controls in hidden groups.
- **`MathTex`** renders inline or display KaTeX with `tex`, `display`, and
  optional `className`.
- **`SvgMath`** places math in an SVG `foreignObject` with explicit `x`, `y`,
  `width`, and `height`. It also accepts alignment, font size, and panel styling.

The scroll layout uses equally sized 240vh tracks. Chapter buttons reveal the
middle of a track; ordinary scrolling plays visuals forward or backward.
On mobile, the canvas pins above the narrative, with measured header offsets.
Use Framer Motion's `useReducedMotion` in custom visual components to present
settled diagrams instead of continuous motion when requested.

Treat chapter definitions as stable for a mounted presentation. Remount to
replace a complete presentation. Avoid nesting the page in an ancestor with
scroll containment: the component tracks the browser window.

## Example and development

[examples/basic](examples/basic) is an independent two-chapter application.
After the package is published, it can be installed and run on its own:

```sh
cd examples/basic
npm install
npm run dev
```

Repository validation tests the actual npm tarball, not source aliases:

```sh
npm ci
npx playwright install chromium
npm test
```

The test command builds ESM and declarations, packs the allowlisted files,
installs the tarball into an isolated ignored consumer, type-checks and builds
that consumer, then runs browser tests against its production build. Checks
cover continuous scrolling, pinning, reverse navigation, mobile layout,
reduced motion, equations/fonts, and short afterword anchors.

After publication, `npm test -- --published` runs the same consumer checks
against the exact manifest version installed from your configured registry.
The release workflow verifies both anonymous registry access and installation.

## Scientific visuals and numerical helpers

Version 0.2 adds optional entry points. The scroll core does not import them:

```tsx
import { MatrixPlot, QuantizationPlot, SpectrumPlot, TradeOffPlot } from '@amitport/react-scrollytelling/plots';
import { uniformQuantize, paretoFrontier, lowRankWeightBits } from '@amitport/react-scrollytelling/numerics';
import '@amitport/react-scrollytelling/styles.css';
```

Plots render SVG; the bundled stylesheet supplies KaTeX fonts and typesetting
for the spectrum's residual and energy formulas. Supply your own data,
titles, units, and descriptions. They accept externally controlled progress
(a number in `[0, 1]` or a Framer Motion `MotionValue`), so the same visual works
as a static figure, a slider-driven illustration, or a scroll-driven scene.
Reduced motion presents the settled visual. Plot colors use a light background
independently of the surrounding presentation theme.
The default palette pairs blue with dark orange. Spectrum and quantization
markers have white outlines to separate them from underlying marks; spectrum
energy markers are enlarged for visibility. Legends and signed matrix scales
use the same color meanings.

All four plots accept `title`, `description`, `className`, `style`, `progress`,
and `reducedMotion` (optional system-preference override). Standalone plots keep
their natural text size inside a keyboard-focusable horizontal scroll region
on narrow screens. Supplying `x`, `y`, `width`, or `height` instead returns a bare
SVG for embedding; the host then owns scaling and readability.

- **`MatrixPlot`** takes rectangular `values`, optional `referenceValues`
  (displays **values minus reference**), a shared `colorDomain`, row/column
  labels, `formatValue`, and highlighted row/column indices. `retainedRank`
  masks the leading square visually; it does **not** compute a low-rank
  approximation. `compact` removes the visible heading, legend, and default
  index labels for embedding small matrices; accessible descriptions remain.
  Supply a shared color domain when comparing matrices or residuals.
- **`QuantizationPlot`** takes `values`, matching `reconstructedValues`,
  optional `levels`, and a `[minimum, maximum]` display/clipping `range`.
  Reconstructions must be inside that range. Optional `labels` and
  `formatValue` control display only. Out-of-range originals are marked clipped.
  Rounding error is reconstruction minus clipped original; total error is
  reconstruction minus original. Progress moves points; labels show final values.
- **`SpectrumPlot`** takes descending nonnegative `values`, `retainedRank`
  (zero through the number of values), optional `labels` and `formatValue`.
  It shows singular values, cumulative **squared** energy, and squared
  Frobenius truncation residual. For an all-zero spectrum, energy fraction and
  residual are both defined as zero. Progress fades discarded bars from opacity
  1 to 0.12 without moving values, energy points, or labels.
- **`TradeOffPlot`** takes `points: { id, x, y, label? }[]`, `xAxis`, and
  `yAxis`. Each axis accepts `label`, `unit`, `domain`, `scale: 'linear' | 'log'`,
  and `direction: 'min' | 'max'`. Directions affect optimization, not axis
  orientation. `showPareto` highlights the raw-data frontier; `pruneDominated`
  additionally fades whole dominated points away with progress. Otherwise,
  progress reveals all points. `selectedId` and `highlightedIds` add rings.
  Labels are not truncated: use sparse labels to avoid collisions. Explicit
  domains clamp displayed coordinates, not objective values. Log values must
  be positive. Auto domains expand constant data; ties remain distinct points.

Open `?view=plots` in the basic example for controlled plots and numerical
helpers. Its default scroll view also drives a spectrum with chapter progress:

```tsx
function SpectrumScene({ progress }: { progress: MotionValue<number> }) {
  const local = useChapterProgress(progress, 1, 2);
  return <SpectrumPlot values={[2, 0.5]} retainedRank={1}
    title="Supplied spectrum" progress={local} />;
}
```

Import `MotionValue` as a type from `framer-motion`, `useChapterProgress` from
the package root, and `SpectrumPlot` from `/plots`. Render this component
inside your canvas rather than calling hooks in a render callback.

The numerical entry point has no React, motion, or DOM dependency:

- `uniformQuantize(value, bits, minimum = -1, maximum = 1)` returns
  `{ value, step, index, levels }`. It uses an endpoint-inclusive uniform grid
  with `2 ** bits` levels, clips inputs, and rounds halfway indices toward
  positive infinity (`Math.round`). This is **not** a generic signed-integer
  affine quantizer: the grid need not contain zero, and there is no zero-point
  calibration. Bit widths are integers from 1 through 16.
- `paretoFrontier(items, [{ value, direction }, { value, direction }])`
  filters two finite objectives, each independently `'min'` or `'max'`.
  Strict dominance requires improvement on at least one objective.
  Equal objective pairs remain distinct, and input order is preserved.
- `lowRankWeightBits(input, output, rank, aBits, bBits)` returns
  `rank * (output * aBits + input * bBits)` for factors shaped
  `[output, rank]` and `[rank, input]`. This counts ideal packed weight bits,
  **not** scale/zero-point metadata, alignment, padding, activations, or workspace.
  Dimensions, rank, and precisions must be positive safe integers; rank cannot
  exceed the smaller dimension and the total must remain a safe integer.

Slide players, trained quantizers, numerical decomposition solvers, exhaustive
allocation APIs, paper assets, and benchmark datasets remain out of scope.

## Releases

CI checks pull requests and `main`. Publishing is a separate, manually invoked
[workflow](.github/workflows/publish.yml), restricted to a version tag matching
the package manifest. It rebuilds and tests the tarball before publishing.
Release jobs do not use dependency caches.

Registry metadata may lag behind a successful publish. Verification retries
briefly; if it still fails, investigate without republishing the version.
Run the workflow on `main` with `verify_only` enabled to repeat validation and
check the manifest version on npm without publishing.

### One-time bootstrap

1. As npm user `amitport`, enable 2FA and create a short-lived granular token
   with permission to create/publish packages under `@amitport`, and 2FA bypass
   for this one automated publication.
2. Save it as repository Actions secret `NPM_BOOTSTRAP_TOKEN`. Never put it in
   source, issues, command arguments, or chat.
3. Create and push the matching version tag. Run **Publish to npm** on that tag
   with `bootstrap` enabled.
4. Verify the package, then revoke the token and remove the GitHub secret.
5. In npm package settings, configure a GitHub Actions trusted publisher:
   user **amitport**, repository **react-scrollytelling**, workflow
   **publish.yml**, no environment. Allow direct `npm publish`.

### Subsequent releases

Update the package and example dependency versions, update the lockfile,
commit, and tag:

```sh
npm version patch
git push origin main --follow-tags
gh workflow run publish.yml --ref v0.1.1
```

Use the actual new version in place of `v0.1.1`. Leave `bootstrap` disabled.
Trusted publishing uses GitHub OIDC, so no persistent npm token is needed.
Verify registry metadata and installation before marking a release complete.
Review [npm trusted-publisher documentation](https://docs.npmjs.com/trusted-publishers/)
for current account and CLI requirements.

Bundled KaTeX assets retain their upstream notices in
`dist/THIRD_PARTY_NOTICES.txt`; the JavaScript dependencies are external.
