+++
status = "open"
opened = "2026-06-15"
+++

# Issue 4: Prove image protocols in Node.js and Rust

## Goal

Determine which terminal image protocols TermPlot can implement reliably from
Node.js and Rust on macOS, then prove those implementations by rendering real
images in Ghostty and iTerm2, taking screenshots, and asserting pixels.

## Background

Issue 2 proved the Ghostty screenshot harness by using `timg -p kitty` as an
external renderer. That proved Ghostty can display Kitty graphics and that the
test harness can verify pixels, but it did not prove that TermPlot can emit
Kitty graphics itself from Node.js or Rust.

Issue 3 recommended a TypeScript/Node daemon and initially deferred Rust, but
the terminal image display layer remains a critical uncertainty. V0 used
`ansi-escapes.image(...)`, which emits the iTerm2 inline image protocol. That
worked for iTerm2 and WezTerm according to the v0 README, but it did not cover
Ghostty's preferred Kitty graphics path and did not compare Node.js with Rust.

Before implementing the TermPlot v1 client, we need an empirical protocol
matrix. The client language should be chosen after proving which protocols can
be emitted, displayed, and tested reliably in the target terminals.

This issue is macOS-only for now. The target terminals are Ghostty and iTerm2.

## Analysis

The issue should investigate every terminal image protocol relevant to Ghostty
and iTerm2:

- Kitty graphics protocol.
- iTerm2 inline image protocol / OSC 1337.
- SIXEL, if either target terminal supports it or if it is useful as a
  compatibility path.
- ANSI/Unicode block fallback, as a lowest-common-denominator fallback.

For each protocol, research and record:

- whether Ghostty supports it on macOS;
- whether iTerm2 supports it on macOS;
- whether a maintained Node.js library exists;
- whether a maintained Rust library exists;
- whether direct implementation from the protocol specification is practical;
- whether a C library exists and whether binding it is worth considering;
- what limitations exist around sizing, cursor movement, chunking, animation,
  transparency, terminal multiplexers, and terminal state.

Implementation paths should be attempted in this order:

1. Use a well-maintained native library in the target ecosystem.
2. Implement directly from the protocol specification.
3. Use or bind a C library only as a last resort.

The output of the issue should be a tested compatibility matrix, not a
preference argument. For each language/protocol/terminal combination, record one
of:

- **Pass**: renders a known image, screenshots correctly, and passes pixel
  assertions.
- **Partial**: renders under constraints or with unresolved ergonomics.
- **Fail**: cannot render, cannot be tested reliably, or has unacceptable
  behavior.
- **Unsupported**: the terminal does not support the protocol.
- **Deferred**: out of scope for this macOS-only phase.

## Protocol Matrix

Fill this matrix as experiments run:

| Protocol                       | Ghostty support                                                                | iTerm2 support                                                        | Node.js path                                                                                                                                   | Rust path                                                                                                             | Node proof                                             | Rust proof                     |
| ------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------ |
| Kitty graphics                 | Supported by Ghostty docs; Issue 2 proved `timg -p kitty` only                 | Not official in iTerm2 docs; third-party detector claims iTerm2 v3.6+ | Pass in Ghostty with dependency-free direct RGB24 Kitty encoder; library candidates remain untested                                            | Pass in Ghostty with dependency-free direct RGB24 Kitty encoder; library candidates remain untested                   | Ghostty: Pass; iTerm2: Pending                         | Ghostty: Pass; iTerm2: Pending |
| iTerm2 inline image / OSC 1337 | Unsupported by current Ghostty evidence; feature request closed as not planned | Supported by iTerm2 docs                                              | Pass in iTerm2 with dependency-free direct OSC 1337 `File=` PNG encoder; v0 used `ansi-escapes.image(...)`; library candidates remain untested | Candidate: `ratatui-image`, `viuer`, `rasteroid`, `iterm2img`, direct spec                                            | iTerm2: Pass; Ghostty: Unsupported by current evidence | Pending                        |
| SIXEL                          | Not documented by Ghostty; treat unsupported until proof or official evidence  | iTerm2 feature-reporting spec defines SIXEL support                   | Candidate: `sixel`, direct encoder; no strong maintained terminal-display wrapper found                                                        | Candidate: `ratatui-image`, `viuer` with feature, `rasteroid`, `icy_sixel`, `a-sixel`; C/FFI via libsixel last resort | Pending                                                | Pending                        |
| ANSI/Unicode block fallback    | Expected text/truecolor capability                                             | Expected text/truecolor capability                                    | Candidate: `terminal-image` fallback or custom half-block renderer                                                                             | Candidate: `ratatui-image` halfblocks, `viuer` default, custom renderer                                               | Pending                                                | Pending                        |

Experiment 1 filled the first researched matrix version. The support/path
columns are evidence-backed research findings, not proof results. The proof
columns must remain `Pending` until later experiments render images from
TermPlot-owned Node.js and Rust code in real terminal windows and pass
screenshot assertions.

## Experiment Roadmap

Experiments should work through the matrix incrementally. Suggested order:

1. Research protocol and terminal support from primary documentation for Ghostty
   and iTerm2.
2. Inventory Node.js libraries for each protocol and identify candidates worth
   testing.
3. Inventory Rust libraries for each protocol and identify candidates worth
   testing.
4. Build a shared deterministic test image and pixel assertion method reused by
   all protocol experiments.
5. Prove or reject Node.js Kitty output in Ghostty.
6. Prove or reject Rust Kitty output in Ghostty.
7. Prove or reject Node.js iTerm2 inline image output in iTerm2.
8. Prove or reject Rust iTerm2 inline image output in iTerm2.
9. Evaluate SIXEL support only if terminal support research justifies it.
10. Evaluate ANSI/Unicode block fallback in both terminals.
11. Compare the practical results and recommend the TermPlot client language and
    protocol strategy.

The order may change if an experiment result reveals a better next step, but the
issue should not close until the matrix is complete enough to support a
client-language decision.

## Constraints

- Do not assume `timg` success proves TermPlot's own protocol encoder.
- Keep `timg` available as a benchmark/oracle, not as the production
  implementation.
- Do not use Ghostty's prompt-producing `-e` command path in automated tests.
- Treat permission prompts as setup failures, not dialogs to accept.
- Do not kill generic Ghostty, iTerm2, Node, Rust, or helper processes. Cleanup
  must be attributed to processes opened by the experiment or test.
- Prefer direct protocol output over C bindings. C libraries are allowed only
  when native library and spec-based implementation paths are inadequate.
- Keep macOS as the only required platform for this issue.

## Verification Strategy

Each proof experiment should:

1. generate or load a deterministic small image with distinctive colors;
2. emit that image from the target language through the target protocol;
3. display it in the target terminal without manual interaction;
4. capture the terminal window or controlled screen rectangle;
5. assert the expected pixels from the screenshot;
6. record process cleanup evidence;
7. retain enough artifact information for debugging failures.

Experiment 2 established an additional proof requirement for Kitty paths:
capture the emitted bytes, assert Kitty APC `ESC_G` protocol output, and reject
iTerm2 OSC 1337 `File=` output so a visible image cannot accidentally pass
through a fallback protocol.

Experiment 4 established the iTerm2 OSC 1337 proof standard: temporarily
preconfigure and restore iTerm2 prompts, capture exact OSC 1337 `File=` bytes,
reject Kitty APC bytes, derive screenshot bounds from the probe-owned iTerm2
window title, dynamically crop the rendered image, and attribute cleanup for
both iTerm2 and iTermServer processes before claiming a pass.

Issue 4 closes when the protocol matrix is filled with evidence-backed statuses
and the conclusion recommends whether the TermPlot client/display layer should
be implemented in Node.js, Rust, or a hybrid.

## Experiments

- [Experiment 1: Research terminal protocol support and libraries](01-research-terminal-protocol-support-and-libraries.md) -
  **Pass**
- [Experiment 2: Prove Node.js Kitty output in Ghostty](02-prove-nodejs-kitty-output-in-ghostty.md) -
  **Pass**
- [Experiment 3: Prove Rust Kitty output in Ghostty](03-prove-rust-kitty-output-in-ghostty.md) -
  **Pass**
- [Experiment 4: Prove Node.js iTerm2 OSC 1337 output](04-prove-nodejs-iterm2-osc1337-output.md) -
  **Pass**
- [Experiment 5: Prove Rust iTerm2 OSC 1337 output](05-prove-rust-iterm2-osc1337-output.md) -
  **Designed**
