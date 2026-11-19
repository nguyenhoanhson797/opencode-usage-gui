# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-11-19

First public release.

### Added

- Desktop Usage tab with the OpenCode Go Limits card, daily chart, totals and per-model requests.
- Ranges: today, 7d, 30d, month and the whole plan period.
- Account picker for every Console sign-in and Go API key OpenCode stores.
- Limits chip beside the new-tab button with a progress ring and a hover list of all accounts
  that have a Go plan.
- Settings page for surface switches, default range and the chip's window.
- English and Vietnamese copy.
- Static preview renderer (`pnpm preview`) and README screenshots for the side panel, limits chip
  and Settings page.

### Security

- Console-only network access, credential resolution through OpenCode's integration API,
  redacted error messages, refused redirects, request timeouts and response caps.
- No local database or auth-file reads, no model-callable tools or session hooks, and no
  self-update code.

### Changed

- Forked from `opencode-quota` and reduced to the OpenCode Go Desktop surface.

[0.1.0]: https://github.com/nguyenhoanhson797/opencode-usage-gui/releases/tag/v0.1.0
