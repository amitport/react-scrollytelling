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

The package exports only the scroll core and math renderers. Slide players,
domain-specific simulations, paper assets, and benchmark data are out of scope.

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
