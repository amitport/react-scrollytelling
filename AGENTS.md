# Agent guide

## Scope
- This is a reusable React scrollytelling library, not a paper presentation.
  Keep paper content, private assets, and fixed teaching datasets out of exported
  components; independent synthetic examples belong in [examples/](examples/).
- Keep the scroll core independent of optional `/plots` and `/numerics`.
  Numerics must remain independent of React, motion, and the DOM.
- Prefer existing math/plot helpers. Do not introduce decomposition solvers or
  production allocation algorithms; see the scope and API contracts in [README.md](README.md).

## Rendering and scientific correctness
- Use `MathTex`/`SvgMath` for equations, not Unicode approximations of TeX.
  Include the bundled stylesheet when rendering KaTeX.
- Preserve numerical values until display formatting. Validate inputs and
  document scientific assumptions, boundary cases, and zero-spectrum behavior.
- Preserve continuous scroll progress, pinned layouts, reverse scrolling,
  reduced motion, and accessible descriptions.
- Check actual rendered labels at desktop, 390px, and 320px widths. Standalone
  plots scroll horizontally; embedded plots leave scaling to their host.
- Check text contrast (4.5:1) and active marker boundaries (3:1), including
  overlaps. Use outlines/shapes as well as color; keep legends consistent.

## Validation
- Use Node 24, as CI does. Target affected tests while iterating; run `npm test`
  before a release. It covers type checking, builds, numerical/render tests,
  and a real packed-package consumer with browser tests.
- Add focused regressions for changed behavior; visually inspect changed plots.
  Do not substitute source symlinks for packed-consumer verification.
- Documentation-only changes need review, not a local application build.

## Dependencies and releases
- Respect the configured local npm registry. Never commit machine-specific
  registry settings, credentials, or temporary `file:` dependencies.
- Publish only for an approved release/consumer update, not for documentation
  edits. Update the manifest, lockfile, and basic example dependency together.
- Commit the tested changes, create the matching `v<version>` tag, and dispatch
  [publish.yml](.github/workflows/publish.yml) on that tag using trusted OIDC
  publishing (`bootstrap` disabled).
- Verify public metadata, tarball integrity, and public-registry installation.
  Registry visibility can lag: use `verify_only` after a successful publication,
  never republish the same version. Follow [release guidance](README.md#releases).
- If a local mirror lags, verify the release workflow's tarball against public
  `dist.integrity` before consumer adoption; do not bypass the configured registry.
