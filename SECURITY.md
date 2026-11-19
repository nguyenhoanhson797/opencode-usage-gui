# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |
| < 0.1 | No |

## Reporting a vulnerability

Use GitHub's private security advisory form:

<https://github.com/nguyenhoanhson797/opencode-usage-gui/security/advisories/new>

Please do **not** open a public issue for a vulnerability, and never include an OpenCode token,
Go API key, credential id or a full Console response with personal usage. Redact anything you
paste. A short description, affected version, impact and reproduction steps are enough.

This is a volunteer project, so acknowledgement and fixes are best-effort; there is no paid
support or guaranteed response time.

## Scope

In scope:

- leaking or logging a credential, or sending one to the wrong host
- following a redirect, or accepting a non-HTTPS Console server
- path traversal, injection, or UI spoofing that could mislead about usage or limits
- reading local files, the SQLite database or the credential table
- adding a model-callable tool, session hook or self-update path
- a packaged tarball that includes secrets, local paths or unexpected files

Out of scope:

- bugs in OpenCode Desktop, its GUI plugin API, or the Console API itself
- the Console's internal endpoints changing without notice
- an account's own plan, billing or usage figures
- shared machines where the user already exposes their OpenCode profile

## Data handling in one paragraph

The plugin sends the Console credential OpenCode already stores to the Console (or the Go usage
route for an API key), with redirects refused, a 12 s timeout and a 256 KB response cap. It does
not read the local database or auth files, does not log the credential, does not write config
files, and does not expose model-callable tools or hooks. The only credential write is OpenCode's
own `credential.activate`, made when the user picks an account in the Limits card.
