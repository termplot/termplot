# Experiment 5: Documentation content

## Description

Write the full TermPlot documentation set into `src/content/docs/`, replacing the
placeholder `getting-started` entry from Experiment 3. This is Stage 5 of the
Issue 6 roadmap. The docs cover the start guide, CLI reference, daemon guide,
terminals & protocols, Plotly input format, Nushell integration, and requirements
& limitations — using the bash/Nushell shell-tabs where a command has both forms.

Every command, flag, default, and behavior is taken from the shipped source and
must be accurate. The authoritative sources, re-read for this experiment:

- `src/bin/termplot.ts` — CLI surface (render/daemon/plots, global options).
- `src/display/protocols.ts` — protocol resolution + terminal detection.
- `src/bin/termplotd.ts` + `src/daemon/server.ts` — TTL precedence + default.
- `src/ipc/protocol.ts` — status/plot/render result shapes.
- `src/renderer/app-server.ts` — default dimensions 1080×810.
- `src/daemon/plot-registry.ts` — config validation.
- `termplot.nu` — Nushell wrapper.

The dedicated **Installation** page (Homebrew + install-from-source) is Stage 6;
this experiment includes the brew one-liner inline in getting-started but does
**not** link to a not-yet-existing `/docs/installation/` page (no broken internal
links). Experiment 6 adds that page and cross-links it.

Commands are written as the installed `termplot` / `termplotd` (consistent with
the aspirational Homebrew install and the home page), not `node build/bin/...`.

## Verified facts the docs must state (from source)

- **render input:** exactly one of a positional JSON argument, `--json <json>`,
  `--file <path>`, or stdin (used when no other source and stdin is not a TTY).
  `render` subcommand is required.
- **terminal vs file output:** without `--output`, render emits terminal image
  bytes (protocol resolved/auto-detected); with `--output <file>` it writes the
  PNG and prints JSON metadata (plotId, output, protocol, contentType, width,
  height, daemonPid, startedDaemon, browserPid, rendererInstanceId, appPort,
  timings).
- **global options:** `--socket <path>`, `--ttl-ms <ms>`, `--log <path>`,
  `--timeout-ms <ms>`, `--json <json>`, `--file <path>`, `--output <file>`,
  `--protocol auto|kitty|iterm2|sixel`.
- **default socket:** `${TMPDIR}/termplotd-<uid>.sock`.
- **render timeouts:** register step default 1000 ms, PNG render default 15000 ms
  (overridable via `--timeout-ms`).
- **daemon subcommands:** `status`, `start`, `stop`, `restart`, `ttl` (requires
  `--ttl-ms`), `renew`. status prints `{running:true,status}` or
  `{running:false,socketPath}`.
- **plots subcommands:** `list`, `register` (requires `--json`), `get <id>`,
  `delete <id>`, `render-png <id>`, `clear`.
- **TTL:** default 1 hour (`60*60*1000` ms); precedence `--ttl-ms` flag >
  `TERMPLOTD_TTL_MS` env > default. `termplotd` also takes `--socket`/`--ttl-ms`.
- **status fields:** pid, socketPath, startedAt, uptimeMs, ttlMs, idleDeadlineAt,
  idleRemainingMs.
- **protocols / detection:** Ghostty (`TERM_PROGRAM=ghostty|Ghostty` or
  `GHOSTTY_RESOURCES_DIR`) → Kitty graphics; iTerm2 (`TERM_PROGRAM=iTerm.app|iTerm2`
  or `ITERM_SESSION_ID`) → OSC 1337; otherwise an `UNSUPPORTED_TERMINAL` error
  asking for `--protocol kitty|iterm2`. `--protocol sixel` raises
  `PROTOCOL_NOT_IMPLEMENTED`.
- **Plotly input:** a JSON **object** with `data` (and optional `layout`,
  `config`); `layout` must be an object if present; `layout.width`/`layout.height`
  must be positive finite numbers if present; default render size 1080×810.
- **errors:** CLI prints `{ ok: false, error: { code, message } }` JSON on
  IpcError/DisplayError.
- **Nushell:** `source termplot.nu` defines `termplot`; pipe a record/value in;
  flags `--output`, `--protocol` (default `auto`), `--socket`, `--ttl-ms`,
  `--log`, `--timeout-ms`, `--cli`, `--display`. Default returns binary PNG;
  `--output` returns parsed JSON metadata; `--display` prints to the terminal.
- **requirements:** Node ≥24, Playwright Firefox (Chromium rejected on macOS
  SkyLight), macOS, Ghostty or iTerm2. Probe scripts also need Screen Recording
  permission and GraphicsMagick.

## Changes

All under `website/src/content/docs/`. Section + order shown; sidebar groups by
section in first-appearance order. Orders are spaced so Experiment 6 can insert
an Installation page (Start, order 15) without renumbering.

- `getting-started.md` — **Start**, order 10 (rewrite): what TermPlot is and how
  it works (daemon + warm browser + terminal image protocols), the Homebrew
  one-liner inline (matching `INSTALL`), a first-plot example in bash and Nushell
  (shell tabs), and where to go next (CLI, daemon, terminals).
- `cli.md` — **Guide**, order 20: the full `termplot` reference — `render` and
  its input sources, terminal vs `--output` behavior + the JSON metadata fields,
  a global-options table, the `daemon` subcommands, the `plots` subcommands, and
  the JSON error shape.
- `daemon.md` — **Guide**, order 30: `termplotd` lifecycle (auto-start + reuse,
  detached), the warm renderer, idle TTL (default 1 h, `--ttl-ms`,
  `TERMPLOTD_TTL_MS`, precedence), `daemon renew` vs inspection, the default
  socket + `--socket`, the in-memory plot registry cleared on exit, and the
  `status` fields.
- `terminals.md` — **Guide**, order 40: supported terminals (Ghostty, iTerm2),
  the two protocols (Kitty graphics, OSC 1337), the auto-detection env rules,
  `--protocol` override, the SIXEL deferral (raises `PROTOCOL_NOT_IMPLEMENTED`),
  and the unsupported-terminal error.
- `plotly.md` — **Guide**, order 50: the Plotly input format (object with
  `data`/`layout`/`config`), the width/height validation + 1080×810 default,
  `staticPlot`, and the four input methods (argument, `--file`, `--json`, stdin)
  with examples.
- `nushell.md` — **Guide**, order 60: `source termplot.nu`, record/table input,
  default binary PNG, `--output` (returns metadata), `--display`, the daemon
  flags, and the `--cli` override.
- `requirements.md` — **Guide**, order 70: requirements (macOS, Ghostty/iTerm2,
  Node ≥24, Firefox renderer) and known limitations (macOS-only, Firefox
  renderer, in-memory plots, SIXEL not a production path, no ASCII/Unicode
  fallback, auto-detect needs terminal env vars).

No component, layout, or config changes — only docs content. The DocNav sidebar,
docs routes, and Pagefind from Experiment 3 render these automatically.

## Verification

Run from `website/`:

1. **Build:** `bun run build` succeeds; all seven docs pages build under
   `dist/docs/<slug>/index.html`; Pagefind indexes them (word count grows well
   beyond the placeholder's 59).
2. **Routes + nav:** each slug page exists in `dist/docs/`; the sidebar on any
   docs page lists all seven entries grouped as Start / Guide in order.
3. **No broken internal links:** extract every internal `href="/..."` from the
   built docs HTML and confirm each resolves to a built file (no link to a
   nonexistent page such as `/docs/installation/`, which is Stage 6).
4. **Accuracy spot-check:** grep the built docs for the documented flags/defaults
   and confirm they match the verified-facts list (e.g. the global-options set,
   the 1-hour TTL + `TERMPLOTD_TTL_MS`, the 1080×810 default, the protocol
   env rules, `source termplot.nu`, the `--protocol sixel` error). A fresh-context
   reviewer re-checks the prose against the source in the completion review.
5. **Visual (both themes):** screenshot two representative docs pages (e.g. the
   CLI reference and the daemon guide) in light and dark via the repo-root Firefox
   script, and **visually inspect** prose, tables, code blocks, and shell tabs for
   legibility and correct theming. Delete `/tmp` shots + the root script after;
   confirm no stray processes/files and a clean `git status`.

**Pass criteria:** build succeeds; all seven docs render with correct sidebar
grouping; no broken internal links; documented commands/flags/defaults match the
source; docs read correctly and legibly in both themes; cleanup leaves no stray
processes/files.
**Fail:** build error, a missing/misgrouped page, a broken internal link, any
inaccurate CLI/daemon/Nushell claim, broken docs rendering, or stray artifacts.

## Design Review

Reviewed by a fresh-context Claude subagent (`Explore` agent type, read-only, no
parent conversation) using the `adversarial-review` skill. The reviewer
systematically cross-checked every entry in the "Verified facts" list against the
real source (`termplot.ts`, `protocols.ts`, `termplotd.ts`, `server.ts`,
`protocol.ts`, `app-server.ts`, `plot-registry.ts`, `termplot.nu`,
`package.json`, `README.md`, `scripts/probe-*.sh`).

**Verdict:** APPROVE — no Blockers, Majors, or Minors. Every documented fact was
confirmed accurate (render input rules, the 8 global options, the 1000/15000 ms
default timeouts, daemon + plots subcommands, the 1-hour TTL with `--ttl-ms` >
`TERMPLOTD_TTL_MS` > default precedence, the status fields, the Ghostty/iTerm2
detection env vars, Kitty/OSC 1337, the `PROTOCOL_NOT_IMPLEMENTED`/
`UNSUPPORTED_TERMINAL` errors, the 1080×810 default, the Plotly validation,
`source termplot.nu` with its flags, and the requirements). The reviewer
confirmed the Start/Guide section grouping works with DocPage's first-appearance
ordering, the spaced 10..70 orders leave room for the Stage 6 Installation page,
the plan correctly avoids broken internal links, and the verification plan
(build, link check, accuracy spot-check, visual) is rigorous. Approved for
implementation with no changes required.

## Conclusion

_Pending result._
