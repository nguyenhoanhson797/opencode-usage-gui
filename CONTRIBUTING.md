# Contributing

Thanks for taking a look. This plugin is intentionally small, and the best contributions keep it
that way: OpenCode Go, Desktop, Console data, no local history.

## Scope

Good fit:

- fixes for the Usage tab, Limits card, chip, settings, formatting and translations
- better parsing of the Console's Go responses and clearer error states
- accessibility, keyboard and narrow-panel improvements
- documentation, screenshots made from sample data, and reproducible bug reports

Usually out of scope:

- new providers, local session scanning, TPS/TTFT, provider splits or history databases
- model-callable tools, slash commands that post into the chat, or session hooks
- telemetry, self-update, price downloads or config-file edits
- a second network host

If you are unsure, open a discussion or an issue first.

## Setup

Requires Node.js 22.12+ (Vite 7) and pnpm 11.

```sh
pnpm install       # installs dev deps
pnpm typecheck
pnpm build
pnpm preview       # preview/*.html, fixed sample data, no network
pnpm pack:check    # inspect the npm tarball
```

`dist/` is not committed. Run `pnpm build` after cloning; `prepack` typechecks and builds before an
npm tarball.

## How it is put together

- `src/server/**` runs in OpenCode's server: no runtime dependencies, one RPC registration, and
  network calls only to the Console (or the Go usage route for an API key). Server changes need a
  Desktop restart.
- `src/gui/**` is the Desktop window bundle. `scripts/build.mjs` uses OpenCode's `gui()` preset, so
  Solid, Effect and `@opencode/plugin/gui` stay external. Window changes reload when rebuilt.
- `src/rpc.ts` is the contract, with a Standard Schema check for every input. `src/types.ts` holds
  the shared shapes. `src/gui/data.ts` holds the window's calls in signals.
- `scripts/preview.mjs` mirrors the panel, chip and settings markup with sample data. It is a visual
  aid, not a second implementation; update it when those surfaces change.

To add an RPC: add the shape to `types.ts`, the schema and method to `rpc.ts`, the handler to
`server/index.ts`, and the caller to `gui/data.ts`.

## Rules that keep the privacy claims true

- Do not read OpenCode's SQLite database, auth files or credential table directly. Use
  `ctx.integration.connection`; it owns and refreshes credentials.
- Do not log, toast, render or cache a token, API key or raw credential id. Error messages must
  stay short and redact secrets.
- Do not add a network host, redirect following, or an unbounded response read.
- Do not add model-callable tools, prompts, session hooks or self-update code.
- Do not write `opencode.json`, `settings.jsonc` or export files.
- Do not activate or edit credentials. The account picker is a read-only view change; the plugin
  never calls `credential.activate`.

## Pull requests

- Keep changes focused and explain the user-visible effect.
- Run `pnpm typecheck`, `pnpm build` and `pnpm pack:check`.
- Check the preview at 360, 420, 560 and 900 px widths when the UI changes.
- Add a changelog entry under `Unreleased` for user-visible changes.
- Use clear commit messages; conventional commits (`feat:`, `fix:`, `docs:`) are welcome.
- By contributing, you agree that your work is released under the MIT licence in `LICENSE`.

## Releasing

Releases are tag-driven: a `vX.Y.Z` tag runs the Release workflow, which builds the plugin,
attaches the zip, tarball and both installers to the GitHub release, and publishes to npm.

1. Update `CHANGELOG.md` and bump `version` in `package.json`.
2. Run `pnpm typecheck && pnpm build && pnpm pack:check`; inspect the file list and sizes.
3. Commit, then push a matching tag: `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. The workflow checks that the tag matches `package.json`, publishes the GitHub release, and runs
   `npm publish` when the repository has an `NPM_TOKEN` secret (an npm automation token). Without
   the secret, the GitHub release and installers still ship.
5. Install the release with the one-command installer in a fresh profile and run the manual check
   above.

## Manual check before a release

1. `pnpm typecheck && pnpm build && pnpm pack:check`.
2. Install the packed tarball in a fresh OpenCode profile and restart Desktop.
3. Check a Console account, a Go API-key account, an account without Go, and two accounts at once.
4. Exercise every range, the account picker, the chip hover list and the chip window setting.
5. Change the locale and check the panel at narrow and wide widths.
6. Confirm the error states: no sign-in, no Go plan, network failure, malformed reply.

Never paste a token, credential id or full Console response into an issue or chat. See
[SECURITY.md](SECURITY.md).
