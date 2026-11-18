# SNCalculator

A calculator plugin for **Supernote** e-ink devices (Nomad, Manta, A5X, A6X).
It opens from the toolbar of a note or document, and puts results or whole
calculations into your note as a text box.

Built with the official Supernote plugin SDK
([`sn-plugin-lib`](https://docs.supernote.com/en)) on React Native 0.79.2.

---

## Features

- **Two keypads**: *Basic*, and *Adv* with `sin` `cos` `tan` and their inverses,
  `log` `ln` `10ˣ` `eˣ` `√` `ⁿ√` `x²` `xʸ` `1/x` `n!` `%` `π` `e` and `×10ⁿ`.
- **Two ways to calculate**
  - **Expr**: type the whole expression, then `=`. `×` and `÷` go before `+` and `−`,
    and parentheses are allowed: `3 + 4 × 2 = 11`.
  - **Step**: like a pocket calculator, every operation is done at once, left to right:
    `2 + 3 × 4 = 20`. Each step lands on the tape.
- **Exact square roots**: `√50 = 5√2 ≈ 7,07106781187`, `sin 45° = √2/2`.
- **Scientific notation**: type `4,5 ×10ⁿ − 2` for 4,5 × 10⁻², switch between
  *NORM* and *SCI* display, and between *DEG* and *RAD*.
- **Local number format**: thousands are grouped with a space (`1 234 567`), and the
  decimal sign follows the device language (a point for English, Chinese, Japanese
  and Korean, a comma otherwise).
- **Tape**: every calculation is kept as a list. Select one or more lines and insert
  only their results, or the complete calculations.
- **Insert into your note**: the result, the last calculation or the selected tape
  lines become an editable text box in the middle of the page.
- **Built-in help**: the `?` button explains every key.
- **Made for e-ink**: black and white, large keys, no animations.

## Installation

1. Build the package (see [Building from source](#building-from-source)).
   You get `build/outputs/Rekenmachine.snplg`.
2. Connect the Supernote by USB and copy the `.snplg` file to the **`MyStyle`** folder.
3. On the device, go to **Settings → Apps → Plugins → Add Plugin**, pick the file and
   install it.
4. Open a note or a document: the calculator icon is now in the toolbar.

The first time you insert something, the device asks permission to change the note.
Allow it to go on.

To update, install the new package the same way. It replaces the old version.

## Using it

### Top row

| Control | What it does |
| --- | --- |
| `Basic` \| `Adv` | Basic keypad, or Adv with the scientific functions. |
| `Expr` \| `Step` | Whole expression with precedence, or step by step like a pocket calculator. |
| `DEG` \| `RAD` | Angles in degrees or radians *(Adv only)*. |
| `NORM` \| `SCI` | Results as normal numbers, or always as a × 10ⁿ *(Adv only)*. |
| `?` | Help screen with an explanation of every key. |
| `✕` | Closes the calculator. Mode, settings and tape are kept. |

### Inserting into a note

| Button | Inserts |
| --- | --- |
| `Result` | The last result, for example `5√2`. |
| `Last calc` | The last calculation. In Step mode: all its steps. |
| `Tape (n)` | Opens the tape as a list. Tap lines to select them (or *Select all*), then insert their **Result**s or their whole **Calculation**s, one per line. |

For example, three selected tape lines inserted as calculations:

```
1 + 1 = 2
2 × 3 = 6
√(50) = 5√2 ≈ 7,07106781187
```

The text box lands in the middle of the current page. Move it with the lasso, or
edit it like any other text box.

## Limitations

- **Inserting only works in notes.** Documents (PDF, EPUB, …) don't accept text
  boxes from plugins, so there the calculator only calculates.
- **Full screen only**: the SDK has no floating or smaller plugin window.
- **The tape lives in memory**: it survives closing the calculator, but not a
  restart of the device. The SDK cannot write files.
- **Exact roots** are recognised for a√n/b with n up to 10 000. Sums such as
  `1 + √2` stay decimal.
- Developed and tested on a Supernote Nomad. The text box size may need tuning on
  other models.

## Building from source

You need [Node.js](https://nodejs.org) 18 or newer and npm. No Android SDK or JDK is
needed: this is a pure JavaScript plugin.

```bash
npm install
npm test               # engine tests (jest)
npm run typecheck
npm run lint
npm run build:plugin   # → build/outputs/Rekenmachine.snplg
```

`npm run build:plugin` runs the official `buildPlugin.ps1` (PowerShell). On macOS or
Linux, run `./buildPlugin.sh` instead.

For every new build you install on a device, raise `versionCode` and `versionName` in
`PluginConfig.json`. Never change `pluginID`: the device would see it as a different
plugin.

## Project structure

```
├── index.js              Plugin entry: registers the toolbar button for NOTE and DOC
├── App.tsx               UI: top row, display, keypad, tape list and help screen
├── src/
│   ├── math.ts           Operators, functions, number entry, formatting, exact roots
│   ├── expression.ts     Expr mode: tokens and a recursive-descent evaluator
│   ├── direct.ts         Step mode: the pocket-calculator state machine
│   ├── calculator.ts     Whole state: settings, both modes, tape, texts to insert
│   ├── insertText.ts     Inserts the text box into the open note
│   ├── textBox.ts        Size and position of that text box
│   ├── help.ts           Help screen text
│   └── buttons.ts        Toolbar button ids
├── __tests__/            Jest tests for the engine and the text box
├── PluginConfig.json     Plugin name, version and permissions
└── buildPlugin.ps1/.sh   Official Supernote packaging scripts
```

The calculation engine in `src/` is plain TypeScript without SDK calls, so it is
fully tested on a PC. Everything that talks to the device sits in `App.tsx`,
`index.js` and `src/insertText.ts`.

## Permissions

| Permission | Why |
| --- | --- |
| `plugin.permission.FILE:WRITE` | To insert the text box into the open note. |

The plugin does not read your files and does not use the internet.
