# Drift Observer DSL - VS Code Extension

Syntax highlighting for the drift.observer narrative DSL.

## Features

- Highlights DSL in standalone `.dsl` files
- **Injects highlighting into JS/TS files** when editing `CHAPTER_X_SCRIPT` template strings

### Highlighted Elements

| Element | Example | Color (typical) |
|---------|---------|-----------------|
| Block tags | `:::chapter{id="x"}` | Blue/Cyan |
| Block end | `:::` | Blue |
| Directives | `@ideal:`, `@capture:` | Purple |
| Speakers | `**Entity:**` | Yellow |
| Inline tags | `<pause/>`, `<glitch>` | Green |
| Variables | `{player_name}` | Orange |
| Attributes | `id="value"` | Light blue + String |

## Installation

### Option 1: Symlink (recommended for development)

```bash
# From the project root
ln -s $(pwd)/tools/vscode-drift-dsl ~/.vscode/extensions/drift-dsl

# Restart VS Code
```

### Option 2: Copy

```bash
cp -r tools/vscode-drift-dsl ~/.vscode/extensions/drift-dsl
# Restart VS Code
```

## After Installation

1. Restart VS Code (or run "Developer: Reload Window")
2. Open `lib/chapter-scripts.js`
3. The DSL inside the template string should now be highlighted

## Troubleshooting

If highlighting doesn't appear:
1. Check that the extension is listed in Extensions sidebar
2. Try "Developer: Inspect Editor Tokens and Scopes" to see what scopes are being applied
3. Ensure the variable is named `CHAPTER_X_SCRIPT` (the injection regex looks for this pattern)
