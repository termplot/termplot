# Experiment 1: Research v1 stack options

## Description

Research the implementation stack for TermPlot v1 and produce a concrete
architecture recommendation. The experiment should study the archived v0 code,
the `nutorchd` daemon model in `~/dev/nutorch`, and current libraries or tools
for browser rendering, screenshot capture, image processing, terminal image
protocols, and CLI implementation languages.

This experiment is documentation-only. It should not implement v1 code. Its
purpose is to decide the stack and identify the next implementation issues.

## Changes

- Add research findings to this experiment file:
  - v0 rendering pipeline and terminal output summary;
  - `nutorchd` daemon lifecycle lessons;
  - TypeScript/Node, Rust, and hybrid stack comparison;
  - current terminal image protocol and library options;
  - screenshot and image-processing options;
  - recommended v1 architecture and rejected alternatives;
  - risk list and proposed follow-up issues.
- Update the Issue 3 README with the final stack recommendation and any
  decision-critical findings.
- Close Issue 3 only if the recommendation answers every question listed in the
  issue analysis.
- Regenerate `issues/README.md` if Issue 3 closes.

## Verification

Pass criteria:

- The experiment inspects the archived v0 TermPlot implementation under `v0/`,
  including CLI entrypoints, server/app code, Plotly storage, screenshot logic,
  and terminal image output.
- The experiment inspects `~/dev/nutorch/nutorchd` and relevant nutorch issues
  for daemon lifecycle, IPC, shutdown, and cleanup patterns.
- The experiment performs current library research for candidate language and
  rendering choices, using primary sources where possible:
  - Plotly.js/browser rendering and screenshot path;
  - Playwright or equivalent browser automation;
  - Rust CLI/process/daemon/IPC options;
  - Rust and Node image encoding/resizing libraries;
  - terminal image protocol libraries or tools for Kitty, iTerm2, and SIXEL.
- The result records a direct recommendation for:
  - daemon language/runtime;
  - foreground CLI language/runtime;
  - IPC mechanism;
  - rendering pipeline;
  - screenshot strategy;
  - terminal display strategy;
  - idle timeout and plot lifecycle model.
- The result records alternatives considered and why they were rejected or
  deferred.
- The issue README contains enough summary for future implementation issues to
  proceed without rereading every research note.
- `dprint fmt` succeeds on the issue files.
- `git diff --check` passes.

Fail criteria:

- The recommendation does not answer the language/runtime choice.
- The experiment does not inspect v0.
- The experiment does not inspect `nutorchd`.
- The experiment relies only on stale memory for external library capabilities.
- The result proposes implementation work without enough evidence to justify the
  stack decision.

## Design Review

Reviewer: Maxwell (`019ecb20-cb51-7183-9670-3331525de54c`), fresh-context Codex
subagent, read-only.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the issue README links
Experiment 1 with status `Designed`, the experiment includes the required
sections, the documentation-only scope is appropriate, verification has concrete
pass/fail criteria, repo hygiene checks are present, and issue-level learning
capture is required.

## Result

**Result:** Pass

### Recommendation

TermPlot v1 should be a TypeScript/Node application with a real daemon,
`termplotd`, and a thin TypeScript/Node foreground CLI for the first v1
implementation.

Do not introduce Rust for v1 yet. Rust is attractive for a future native CLI,
packaging story, and terminal-protocol implementation, but it does not remove
the hard dependency on a browser JavaScript runtime for Plotly.js. Splitting the
foreground CLI into Rust now would add a second build system, a cross-language
IPC boundary, and packaging complexity before the daemon contract is proven.

The v1 architecture should be:

1. `termplotd`: TypeScript/Node daemon.
   - Owns the React Router/Express app.
   - Owns the long-lived browser controller.
   - Owns the in-memory plot registry.
   - Renders plots to PNG buffers.
   - Exposes lifecycle and plot APIs over a local IPC channel.
2. `termplot`: TypeScript/Node CLI.
   - Parses stdin/arguments.
   - Auto-starts `termplotd` if needed.
   - Sends plot specs to the daemon.
   - Receives PNG bytes and metadata.
   - Emits terminal image escape codes or writes a PNG file.
3. Terminal display layer: isolated module.
   - First target: Kitty graphics for Ghostty.
   - Second target: iTerm2 inline image protocol for iTerm2 and WezTerm.
   - Fallback: Unicode block rendering or an explicit unsupported-terminal
     error.
   - Use `timg` as a benchmark/oracle in tests, not as a required runtime
     dependency.
4. Future Rust option: a later issue may replace only the foreground CLI and
   display module with Rust if Node proves weak for terminal detection, protocol
   support, or native distribution.

### v0 Findings

The archived v0 implementation already proves the central rendering idea: store
a Plotly config by ID, serve a React Router route, render Plotly.js in the
browser, screenshot the page, and print the image in the terminal.

Key files:

- `v0/cli/cli-entry.ts`: the plain CLI imports Puppeteer, starts a browser for
  each call, opens a page, sets a viewport, stores the plot in `plotlyDb`,
  navigates to `/plotly/:id`, screenshots the page, closes page/browser/server,
  and prints `ansi-escapes.image(...)`.
- `v0/cli/nu_plugin_termplot.ts`: the Nushell plugin lazily imports Puppeteer,
  caches a browser and page at module scope, then returns raw PNG bytes as
  Nushell binary pipeline data. This is the prototype of the daemon value:
  keeping the browser warm makes later renders much faster.
- `v0/server/app.ts`: React Router is mounted through `@react-router/express`.
- `v0/app/routes/plotly.$id.tsx`: the route loads the plot config from
  `plotlyDb` and calls `Plotly.newPlot(...)` in a browser-only component.
- `v0/cli/plotly-db.ts`: plot configs live in an in-memory `Map`, with add, get,
  remove, list, and clear operations. The singleton is stored on `globalThis` to
  bridge the app/server module split.
- `v0/cli/display-image.ts`: image display is separated enough to show the
  intended interface: stdin image bytes in, terminal escape string out.

The main v0 weakness is lifecycle, not rendering. The plain CLI pays the full
server/browser cost on every call. The Nushell plugin keeps a browser warm, but
only inside the plugin process and without daemon lifecycle commands,
cross-shell access, or idle cleanup.

### nutorchd Findings

`nutorchd` provides the lifecycle model TermPlot should adapt:

- default socket path under `$TMPDIR`;
- local Unix socket with newline-delimited JSON;
- probe-before-bind so a new daemon does not steal a live daemon's socket;
- default one-hour idle TTL;
- TTL override by flag and environment variable;
- lifecycle state tracking started, last activity, idle, remaining, and expiry;
- clean socket unlink on idle expiry, shutdown request, SIGTERM, and SIGINT;
- client auto-start that locates the daemon binary, redirects daemon output to a
  log file, polls the socket until live, and then retries the request;
- daemon command family for status, ttl, stop, restart, and start;
- thread-per-connection with serialized execution behind a lock.

TermPlot does not need Rust to copy these ideas. Node's standard library has
stable primitives for IPC servers/clients and detached child processes. The
important transfer is the behavior contract:

- start on demand;
- never displace a live daemon;
- clean up stale sockets;
- record pid/socket/log/ttl in `status`;
- make `status`, `stop`, and `ttl` non-spawning;
- make plot rendering activity reset the idle clock;
- make observation not reset the idle clock;
- close after roughly one hour of non-use by default;
- delete all in-memory plots when the daemon exits.

### External Library Findings

Primary-source research:

- React Router officially supports server adapters, including
  `@react-router/express`, and documents the same `createRequestHandler` pattern
  v0 already uses: <https://reactrouter.com/api/other-api/adapter>.
- Playwright can screenshot pages to files, full pages, elements, or buffers:
  <https://playwright.dev/docs/screenshots>.
- Plotly.js can export charts to static images in the browser with
  `Plotly.toImage(...)`, including PNG output:
  <https://plotly.com/javascript/static-image-export/>.
- Node's `node:net` module supports stable stream-based TCP and IPC servers and
  clients: <https://nodejs.org/api/net.html>.
- Node's `child_process` supports detached long-running children; the docs also
  warn that background children need detached mode, `unref()`, and stdio not
  connected to the parent: <https://nodejs.org/api/child_process.html>.
- Ghostty officially supports the Kitty graphics protocol:
  <https://ghostty.org/docs/features>.
- The Kitty graphics protocol is designed for arbitrary raster graphics in a
  terminal: <https://sw.kovidgoyal.net/kitty/graphics-protocol/>.
- iTerm2 documents its inline images protocol as OSC 1337 file escapes with
  base64 file contents and inline display options:
  <https://iterm2.com/documentation-images.html>.
- WezTerm implements the iTerm2 inline image protocol and ships an `imgcat`
  command: <https://wezterm.org/imgcat.html>.
- Alacritty still does not have first-class SIXEL support merged; the long-lived
  upstream issue remains open:
  <https://github.com/alacritty/alacritty/issues/910>.
- `timg` supports SIXEL, Kitty, iTerm2, and Unicode block fallback:
  <https://github.com/hzeller/timg>.
- `sharp` is a strong Node image-processing choice for resizing/conversion if
  screenshots need post-processing: <https://sharp.pixelplumbing.com/>.
- Rust's `image` crate provides native Rust encoding/decoding and basic image
  manipulation: <https://docs.rs/image>.
- Rust's `clap` remains the obvious CLI parser if a future Rust CLI is opened:
  <https://docs.rs/clap/latest/clap/_derive/index.html>.
- Rust terminal-image libraries exist, but are not a clear reason to switch
  languages now. `ratatui-image` unifies SIXEL, Kitty, and iTerm2 protocols for
  Ratatui TUIs, while smaller crates such as `kitty-graphics-protocol`,
  `iterm2img`, and SIXEL encoders would still need integration and testing.

### Alternatives Considered

#### Pure Rust

Rejected for v1. Rust cannot avoid the browser/Plotly.js dependency unless
TermPlot abandons Plotly.js or reimplements plot rendering. Browser control from
Rust would still require launching Chromium and bridging to JavaScript. That
adds complexity without removing the expensive runtime.

#### Rust CLI + Node daemon

Deferred. This is likely the best future native packaging shape, especially if
terminal detection and image protocol output become complex. It is not the best
first v1 stack because it forces cross-language packaging before the daemon API
is stable.

#### Node daemon + Node CLI

Accepted for v1. It is the shortest path from v0 to a real daemon, preserves the
working Plotly/React Router/Puppeteer stack, can copy the `nutorchd` lifecycle
contract, and keeps all implementation in one runtime while interfaces settle.

#### External `timg` for production output

Rejected as a required dependency, accepted as a benchmark. `timg` is excellent
for proving that a terminal can display an image and should remain useful in the
Ghostty test harness. TermPlot should still own its primary output path so users
do not need an extra binary for normal plotting.

#### Plotly.toImage Instead of Browser Screenshot

Deferred as an optimization experiment. Plotly's browser API can export PNG
directly, which may be faster than page screenshots. The v0 screenshot path is
more general because it captures the actual rendered page and can support future
non-Plotly or app-framed output. V1 should keep screenshot rendering first and
compare `Plotly.toImage` after the daemon exists.

### Detailed v1 Stack

Daemon language/runtime: TypeScript on Node.js.

Foreground CLI language/runtime: TypeScript on Node.js for v1. Keep the CLI
small enough that it can be replaced by Rust later without changing daemon
semantics.

IPC: Unix domain socket on macOS/Linux using Node `net`; localhost TCP fallback
for Windows later. Use newline-delimited JSON for control messages. Large image
responses may begin as base64 in JSON for simplicity, but the daemon API should
allow moving to a binary/framed response if needed.

Daemon lifecycle:

- default socket: `$TMPDIR/termplotd.sock`;
- default log: socket path with `.log`;
- default idle TTL: 3600 seconds;
- env override: `TERMPLOTD_TTL`;
- daemon flag: `--ttl`;
- commands: `termplot daemon status|start|stop|restart|ttl`;
- activity that resets idle: render/add/delete plot operations;
- activity that does not reset idle: status and configuration inspection;
- clean exit: idle expiry, explicit shutdown, SIGTERM, SIGINT;
- stale socket policy: probe-before-bind;
- live daemon policy: never steal the socket from a live daemon.

Plot lifecycle:

- `add/render` creates a plot ID and stores the Plotly config in memory;
- `render <id>` may re-render an existing plot;
- `delete <id>` removes one plot;
- `clear` removes all plots;
- daemon exit removes all plots;
- no per-plot TTL in v1.

Rendering pipeline:

1. CLI parses JSON from argument/stdin.
2. CLI ensures `termplotd` is running.
3. CLI sends render request.
4. Daemon validates config.
5. Daemon stores config in the in-memory plot registry.
6. Daemon reuses a warm browser page/context.
7. Browser navigates to the React Router plot route or uses a render endpoint.
8. Plotly renders in the browser.
9. Daemon screenshots the element/page to a PNG buffer.
10. Daemon returns PNG bytes plus width, height, plot ID, and render timing.
11. CLI chooses terminal protocol and writes image escape codes to stdout.

Screenshot strategy: keep browser screenshot as the default. Use an element
screenshot where possible so output is the plot surface, not incidental page
chrome. Use Playwright or Puppeteer behind a small `BrowserRenderer` interface;
Puppeteer is already proven by v0, while Playwright is attractive for future
tests and buffer screenshots.

Terminal display strategy:

- detect/allow explicit protocol selection;
- default to Kitty in Ghostty;
- use iTerm2 protocol in iTerm2 and WezTerm;
- use `timg` in tests as an independent oracle;
- defer SIXEL production support unless a strong Node library or a Rust display
  module is selected later;
- report unsupported terminals clearly instead of printing raw escape garbage.

Image processing: use browser-produced PNG directly first. Add `sharp` only when
resizing, padding, format conversion, or density correction is needed.

### Risks

1. Node daemon lifecycle bugs: mitigated by copying `nutorchd` behavior and
   testing start/status/stop/restart/ttl against private sockets.
2. Browser readiness and Plotly render timing: v0 used a fixed 20 ms delay in
   the plugin. V1 needs a deterministic browser-side ready signal before
   screenshot.
3. Terminal protocol detection: environment-variable guesses can be wrong.
   Provide explicit `--protocol` and test in real terminals with Issue 2's
   Ghostty harness.
4. Large PNG responses over NDJSON: acceptable initially, but binary framing may
   be needed if large plots are slow.
5. macOS permissions: daemon rendering is headless and should not require GUI
   automation permissions; full-stack terminal tests that use `screencapture`
   still need preflighted Screen Recording access.
6. Distribution: a Node daemon and Node CLI are easy through npm/pnpm but less
   ideal for native Homebrew-style distribution. Defer native packaging until
   the daemon API stabilizes.

### Verification

The experiment inspected:

- v0 CLI rendering path: `v0/cli/cli-entry.ts`;
- v0 Nushell plugin warm-browser path: `v0/cli/nu_plugin_termplot.ts`;
- v0 React Router/Express app: `v0/server/app.ts`;
- v0 Plotly route: `v0/app/routes/plotly.$id.tsx`;
- v0 plot registry: `v0/cli/plotly-db.ts`;
- v0 image display helper: `v0/cli/display-image.ts`;
- v0 manifest and README: `v0/package.json`, `v0/README.md`;
- nutorch daemon lifecycle and IPC: `~/dev/nutorch/nutorchd/src/main.rs`,
  `~/dev/nutorch/nutorchd/src/lifecycle.rs`,
  `~/dev/nutorch/nutorchd/src/protocol.rs`;
- nutorch client auto-start and socket handling:
  `~/dev/nutorch/torch-cli/src/main.rs`;
- nutorch lifecycle issues: `~/dev/nutorch/issues/0002-nutorchd-poc/README.md`,
  `~/dev/nutorch/issues/0004-daemon-lifecycle/README.md`,
  `~/dev/nutorch/issues/0007-daemon-concurrency/README.md`;
- current external docs listed above.

Verification commands:

```bash
dprint fmt issues/0003-research-v1-tech-stack/README.md \
  issues/0003-research-v1-tech-stack/01-research-v1-stack-options.md
git diff --check
```

Both commands passed.

## Conclusion

Issue 3's stack decision is made: implement TermPlot v1 as a TypeScript/Node
daemon and TypeScript/Node CLI first. Preserve Rust as a later, isolated CLI or
terminal-display replacement only after the daemon API and output requirements
are proven.

The next implementation issue should build the `termplotd` skeleton: local
socket IPC, auto-start, status/start/stop/restart/ttl commands, one-hour idle
TTL, clean socket/log handling, and an in-memory plot registry. Rendering can
then move in as the next issue by porting the v0 React Router/Plotly/Puppeteer
path behind the daemon API.

## Completion Review

Reviewer: Poincare (`019ecb28-1b9d-7ec2-96aa-caa5ef825bbd`), fresh-context Codex
subagent, read-only.

Findings:

- Blocker: none.
- Major: none.
- Minor: none.

Approval: approved. The reviewer confirmed that the completed experiment matches
the documentation-only scope, records `**Result:** Pass` and a conclusion, the
issue README status matches the result, the issue-level conclusion captures the
stack decision and next implementation direction, verification checks are
consistent with the record, and the result commit had not yet been made.
