// Paired-fence shell tabs (issue 0015 exp 1): a ```bash fence immediately
// followed by a ```nu fence (whitespace-only text nodes between blocks are
// skipped; the order is the authoring contract — bash first) is wrapped in
// a tab group. Runs AFTER Astro's Shiki step, so it sees highlighted
// <pre data-language="…"> elements and moves them WITHOUT altering their
// bytes. Unpaired fences pass through untouched.
//
// Set SHELL_TABS_DISABLE=1 to no-op the plugin (the fence-level baseline
// diff in verification builds once with it disabled).

function isPre(node, lang) {
  return (
    node?.type === "element"
    && node.tagName === "pre"
    && node.properties?.dataLanguage === lang
  );
}

function isWhitespaceText(node) {
  return node?.type === "text" && node.value.trim() === "";
}

function tabButton(id, shell, label, selected) {
  return {
    type: "element",
    tagName: "button",
    properties: {
      type: "button",
      role: "tab",
      id: `shell-tab-${id}-${shell}`,
      ariaControls: `shell-panel-${id}-${shell}`,
      ariaSelected: String(selected),
      dataShellTab: shell,
      className: ["shell-tab"],
    },
    children: [{ type: "text", value: label }],
  };
}

function panel(id, shell, pre, hidden) {
  const properties = {
    id: `shell-panel-${id}-${shell}`,
    role: "tabpanel",
    ariaLabelledBy: `shell-tab-${id}-${shell}`,
    dataShellPanel: shell,
  };
  if (hidden) properties.hidden = true;
  return { type: "element", tagName: "div", properties, children: [pre] };
}

function wrapper(id, bashPre, nuPre) {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["shell-tabs"] },
    children: [
      {
        type: "element",
        tagName: "div",
        properties: {
          className: ["shell-tablist"],
          role: "tablist",
          ariaLabel: "Shell",
        },
        children: [
          tabButton(id, "posix", "bash / zsh", true),
          tabButton(id, "nu", "Nushell", false),
        ],
      },
      panel(id, "posix", bashPre, false),
      panel(id, "nu", nuPre, true),
    ],
  };
}

export default function rehypeShellTabs() {
  const disabled = process.env.SHELL_TABS_DISABLE === "1";
  return (tree) => {
    if (disabled) return;
    let counter = 0;
    const walk = (node) => {
      if (!node.children) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (isPre(child, "bash")) {
          let j = i + 1;
          while (
            j < node.children.length
            && isWhitespaceText(node.children[j])
          ) j++;
          const next = node.children[j];
          if (next && isPre(next, "nu")) {
            node.children.splice(i, j - i + 1, wrapper(counter++, child, next));
            continue;
          }
        }
        walk(child);
      }
    };
    walk(tree);
  };
}
