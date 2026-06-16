---
title: "Plotly input"
description: "The Plotly config format TermPlot accepts, dimension handling, and the four ways to supply it."
order: 50
section: "Guide"
---

TermPlot accepts a [Plotly](https://plotly.com/javascript/reference/) config as a
single **JSON object**. The object holds the same fields you would pass to
`Plotly.newPlot`: `data` (the traces), and optionally `layout` and `config`.

```json
{
  "data": [
    { "x": [1, 2, 3], "y": [2, 5, 3], "type": "scatter" }
  ],
  "layout": { "width": 640, "height": 480 },
  "config": { "staticPlot": true }
}
```

Anything Plotly.js can draw — scatter, bar, box, heatmaps, and the rest — renders
the same way in TermPlot, because it is Plotly.js doing the drawing.

## Validation

TermPlot validates the shape before rendering:

- The top level must be a JSON **object** (not an array or a primitive).
- `layout`, if present, must be an object.
- `layout.width` and `layout.height`, if present, must be **positive, finite
  numbers**.

Invalid input returns a JSON error with a code such as `INVALID_PLOT_CONFIG` or
`INVALID_DIMENSIONS`.

## Dimensions

If you set `layout.width` and `layout.height`, TermPlot renders at that size.
Otherwise it falls back to a default of **1080 × 810**. Setting
`config.staticPlot` to `true` removes interactivity and the mode bar, which is
usually what you want for a screenshot.

## Supplying the config

There are four ways to give `render` its config (use exactly one):

```bash
# 1. As an argument
termplot render '{"data":[{"x":[1,2,3],"y":[2,5,3],"type":"scatter"}]}'

# 2. From a file
termplot render --file plot.json

# 3. With the --json flag
termplot render --json '{"data":[{"y":[1,3,2],"type":"bar"}]}'

# 4. From stdin
cat plot.json | termplot render
```

In Nushell you build the config as a native record and pipe it in — see
[Nushell](/docs/nushell/).
