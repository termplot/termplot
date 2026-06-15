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

| Protocol                       | Ghostty support | iTerm2 support | Node.js path                      | Rust path | Node proof | Rust proof |
| ------------------------------ | --------------- | -------------- | --------------------------------- | --------- | ---------- | ---------- |
| Kitty graphics                 | Unknown         | Unknown        | Unknown                           | Unknown   | Pending    | Pending    |
| iTerm2 inline image / OSC 1337 | Unknown         | Unknown        | v0 used `ansi-escapes.image(...)` | Unknown   | Pending    | Pending    |
| SIXEL                          | Unknown         | Unknown        | Unknown                           | Unknown   | Pending    | Pending    |
| ANSI/Unicode block fallback    | Expected        | Expected       | Unknown                           | Unknown   | Pending    | Pending    |

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

Issue 4 closes when the protocol matrix is filled with evidence-backed statuses
and the conclusion recommends whether the TermPlot client/display layer should
be implemented in Node.js, Rust, or a hybrid.

## Experiments

- [Experiment 1: Research terminal protocol support and libraries](01-research-terminal-protocol-support-and-libraries.md) -
  **Designed**
