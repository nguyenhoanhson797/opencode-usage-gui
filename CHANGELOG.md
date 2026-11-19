# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-11-19

Documentation-only release.

### Changed

- README install section leads with `opencode plugin add opencode-usage-gui` now that the package is
  published, and keeps the release installer as the no-npm fallback.

## [0.1.0] — 2026-11-19

First public release.

### Added

- Desktop Usage tab with the OpenCode Go Limits card, daily chart, totals and per-model requests.
- Ranges: today, 7d, 30d, month and the whole plan period.
- Account picker for every Console sign-in and Go API key OpenCode stores, grouped by Console
  subscriber id so one Go account is one row even when both connect methods exist.
- Limits chip beside the new-tab button with a progress ring and a hover list of all accounts
  that have a Go plan.
- Settings page for surface switches, default range and the chip's window.
- Loading states for the account list, limits and the chip's first read.
- English and Vietnamese copy.
- Static preview renderer (`pnpm preview`) and README screenshots for the side panel, limits chip
  and Settings page.
- One-command installers (`install.ps1`, `install.sh`) that place the built plugin in the global
  OpenCode plugin folder, so no config edit is needed.
- Tag-driven release workflow: GitHub release with the built plugin and installers, plus npm
  publish when `NPM_TOKEN` is set.

### Security

- Console-only network access, credential resolution through OpenCode's integration API,
  redacted error messages, refused redirects, request timeouts and response caps.
- No local database or auth-file reads, no model-callable tools or session hooks, and no
  self-update code.

### Changed

- Account selection is a read-only view change: it never activates an OpenCode credential and
  never changes the running session.
- Removed the decorative chevrons from the Limits, Totals and Models cards.
- Forked from `opencode-quota` and reduced to the OpenCode Go Desktop surface.

[0.1.1]: https://github.com/nguyenhoanhson797/opencode-usage-gui/releases/tag/v0.1.1
[0.1.0]: https://github.com/nguyenhoanhson797/opencode-usage-gui/releases/tag/v0.1.0
