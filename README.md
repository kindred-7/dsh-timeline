# DSH Conversation Timeline Plugin

[![npm version](https://img.shields.io/npm/v/@kindred7/dsh-timeline)](https://www.npmjs.com/package/@kindred7/dsh-timeline)

A DeepSeek Harness (DSH) client plugin that renders a vertical timeline on the left side of the conversation window — one tick per user question — giving long conversations a "global map" for quick navigation.

## Features

- 📍 **Timeline markers** — every user question gets a short tick on the left of the conversation area
- ✨ **Hover effect** — ticks smoothly extend and highlight in blue with a soft glow; neighboring ticks ripple outward
- 💬 **Tooltip preview** — hovering shows a frosted-glass tooltip with the full question text
- 🎯 **Click to navigate** — click any tick to smooth-scroll to that message
- 📌 **Adaptive positioning** — follows sidebar resize / window zoom / layout collapse in real time, with a three-level container-detection fallback (no reliance on hashed class names)
- 🌗 **Light & dark themes** — adapts automatically via `prefers-color-scheme`
- ♿ **Accessible** — honors `prefers-reduced-motion`; ticks carry `aria-label`

## Requirements

- DSH and pnpm on PATH (Methods A–B) — or nothing at all (Methods C & D)
- DSH ≥ 0.1.1-rc.2 · React 18+ · Web platform only

## Installation

### Method A: one command via the dsh CLI (recommended)

`dsh plugin --profile web <args>` runs pnpm inside the web profile directory (`%USERPROFILE%\.dsh\profiles\web`, created on first use) and, after every successful install/update/remove, reconciles `dsh.profile.bundles`: any dependency whose package declares `dsh.bundle` is registered automatically — no manual register step.

```powershell
# from the npm registry — also reachable in China without a proxy (auto-synced by npmmirror)
dsh plugin --profile web add @kindred7/dsh-timeline

# or straight from GitHub
dsh plugin --profile web add github:kindred-7/dsh-timeline

# restart DSH web to load it
dsh web
```

Pin a version or manage the plugin with the same command:

```powershell
dsh plugin --profile web add @kindred7/dsh-timeline@0.4.0           # pin an npm version
dsh plugin --profile web update @kindred7/dsh-timeline              # update to latest
dsh plugin --profile web remove @kindred7/dsh-timeline              # uninstall (also unregisters)
```

> npmmirror syncs new publishes within minutes; if a brand-new version 404s on the mirror, retry shortly or append `--registry=https://registry.npmjs.org` to the command once.

### Method B: drive pnpm in the profile directory yourself

On the target machine (Node.js ≥ 18 and pnpm required):

```powershell
# 1. Enter the dsh web profile directory
cd %USERPROFILE%\.dsh\profiles\web

# 2. Install (pick one)
pnpm add @kindred7/dsh-timeline                         # latest from the npm registry
pnpm add @kindred7/dsh-timeline@0.4.0                   # pin a version
pnpm add github:kindred-7/dsh-timeline                  # or latest main branch from GitHub
pnpm add https://registry.npmjs.org/@kindred7/dsh-timeline/-/dsh-timeline-0.4.0.tgz   # registry tarball

# 3. Register into dsh.profile.bundles
pnpm exec dsh-timeline-register

# 4. Restart DSH web
dsh web
```

Uninstall:

```powershell
pnpm exec dsh-timeline-register --remove   # remove the bundle entry
pnpm remove @kindred7/dsh-timeline         # remove the dependency
```

### Method C: one-click script (no Node/pnpm needed)

1. Download and unzip `dsh-timeline-<version>.zip` anywhere
2. Run the installer from the plugin folder:

```powershell
cd dsh-timeline
.\install.ps1
# if execution policy blocks it:
# powershell -ExecutionPolicy Bypass -File .\install.ps1
```

The script copies the plugin into `%USERPROFILE%\.dsh\profiles\web\node_modules\`, writes the dependency entry, and registers the bundle. It is idempotent — safe to re-run for updates.

Uninstall: `.\uninstall.ps1`

### Method D: manual

1. Copy the plugin folder:

```bash
xcopy /E /I "<plugin-folder>" "%USERPROFILE%\.dsh\profiles\web\node_modules\@kindred7\dsh-timeline"
```

2. Open `%USERPROFILE%\.dsh\profiles\web\package.json` and wire it up:

```json
{
  "dependencies": {
    "@kindred7/dsh-timeline": "file:./node_modules/@kindred7/dsh-timeline"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@kindred7/dsh-timeline"
      ]
    }
  }
}
```

3. Restart DSH web (`dsh web`)

### Local development

After changing code, refresh the snapshot inside the profile, then reload the page (Ctrl+F5):

```powershell
cd %USERPROFILE%\.dsh\profiles\web
pnpm add D:\path\to\dsh-timeline
pnpm exec dsh-timeline-register      # only needed the first time
```

## Usage

Once installed, the timeline renders automatically:

- **View** — each user question shows a gray tick on the left (6px spacing, vertically centered)
- **Preview** — hover extends a tick (12px → 24px), tints it blue with glow, and shows a tooltip of the question
- **Navigate** — click a tick to smooth-scroll that question to the top of the view; works reliably even when pinned to the bottom or during streaming. If the target is already at the physical scroll limit (e.g. the newest question while you sit at the very bottom), the row flashes briefly instead — nothing can scroll further. Keyboard navigation supported via Tab

## Plugin structure

```
dsh-timeline/
├── package.json          # manifest, peer deps, dsh bundle/client hints
├── cordis.patch.yml      # bundle patch descriptor consumed by DSH
├── register.js           # register/unregister CLI (bin: dsh-timeline-register)
├── install.ps1           # Windows one-click installer
├── uninstall.ps1         # uninstaller
├── lib/
│   ├── index.js          # plugin entry
│   └── client.js         # client implementation (core)
├── USAGE.md              # detailed usage guide (Chinese)
├── README.md             # this file
└── README.zh.md          # Chinese readme
```

## How it works

- `lib/index.js` exposes the bundle patch (`cordis.patch.yml`) so the DSH client runtime injects the plugin UI into layout/conversation bundles
- `lib/client.js` listens to the session via `useSession()`, extracts `user/message` events, renders ticks positioned against the conversation container, and handles hover ripple, tooltip, and click-scroll behavior

## Styling

Override the CSS classes to customize:

```css
.timeline-marker { background-color: #10b981; }
.timeline-marker:hover { background-color: #059669; box-shadow: 0 0 12px rgba(16, 185, 129, 0.6); }
.timeline-container { left: 80px; }
```

## Compatibility

- DSH 0.1.1-rc.2+, React 18+, Web platform only
- Windows 10/11 · Chrome / Edge / Firefox

## Known limitations

- Ticks are positioned relative to the conversation container; exotic layouts may need a `left` tweak
- Tooltip placement is mouse-based and can clip at screen edges
- Only user messages are shown (assistant/system messages have no ticks)

## Changelog

### 0.4.1

- **Changed** — tooltip restyled to match DSH native overlays (design tokens: dark plate `rgb(44,44,46)`, white text, 13px/20px, 10px radius) and clamped to 3 lines with ellipsis

### 0.4.0

- **Changed** — published to npm as **@kindred7/dsh-timeline** (the unscoped `dsh-timeline` name was already taken); a bare registry specifier now installs without touching GitHub, and npmmirror keeps it reachable in China
- **Fixed** — tick navigation failing at the bottom of long conversations:
  - hidden duplicate conversation views (trajectory/tabs) hijacked the global DOM query; the plugin now targets the first *visible* row and resolves the scroller via `row.closest('[data-conversation-scroll]')` (same semantics as the host)
  - the host's pinned-to-bottom follow (ResizeObserver snap) cancelled smooth scrolls started at the bottom; navigation now releases the pin with an instant pre-nudge before gliding
- **Added** — flash highlight on the target row when no scroll displacement is physically possible
- **Fixed** — active-tick highlight could track a hidden view copy under multi-view mounting

### 0.3.0

- Initial public release

## License

MIT

## Contributing

Issues and PRs welcome at <https://github.com/kindred-7/dsh-timeline>
