# WALL-E

A macOS menu-bar companion that plays synthesized sounds when things happen on your Mac — battery warnings, USB connections, screen lock/unlock, high CPU, app crashes, Caps Lock, VPN changes, and 40+ more events.

The icon is a small round face with two eyes that blinks at human cadence, goes `-_-` when disabled, and widens its eyes for a moment when it reacts to an event. Left-click the icon to toggle everything on/off instantly.

**No audio files bundled** — all sounds are synthesized from pure math at first launch and cached locally.

---

## Download

Grab the latest `.dmg` from [Releases](../../releases/latest), open it, drag **WallE** into `/Applications`, and launch it.

> First launch: macOS will ask for permission to run since the app is not notarized. Right-click → Open, or run:
> ```bash
> xattr -d com.apple.quarantine /Applications/WallE.app
> ```

The app registers itself as a Login Item automatically — it will start with your Mac on next login.

---

## Requirements

- macOS 13 Ventura or later
- Apple Silicon or Intel Mac (the DMG is a universal binary)

---

## What it reacts to

| Category | Events |
|---|---|
| Power | Charger plugged/unplugged, battery at 1/2/3/4/5/10/15/20/100% |
| System | Sleep/wake, screen lock/unlock, idle (30 min), Caps Lock on/off |
| Hardware | USB device in/out, display in/out, Bluetooth device in/out |
| Network | Wi-Fi connected/new SSID, internet lost/restored, VPN on/off, public IP changed |
| Apps | Claude opened, Spotify on/off/track skip, terminal opened, app crashed |
| File system | Download completed, screenshot taken, large file (>1 GB), Desktop clutter, Trash >500 MB emptied |
| Security | `sudo` used, camera/mic activated |
| Time | Morning greeting (9 AM), lunch (1 PM), evening (6 PM), night (11 PM), overtime (9 PM) |
| Fun | Random WALL-E chirp (every ~3 h) |

---

## Configuration

Config lives at `~/Library/Application Support/wall-e/config.json` and is created on first launch. The app reloads it automatically on every save — no restart needed.

Open it from the menu: **right-click the icon → Open config…**

```jsonc
{
  "version": 1,
  "enabled": true,       // master toggle (also: left-click the icon)
  "volume": 1.0,         // 0.0 – 1.0
  "notifications": false, // macOS notification toasts (off by default; the icon reacts visually instead)

  "events": {
    "battery-5":  { "enabled": true, "cooldownMs": 120000 },
    "cpu-hot":    { "enabled": false },   // silence this event
    "screenshot": { "enabled": true, "cooldownMs": 5000 }
    // ... one entry per event key (all enabled by default)
  },

  "monitors": {
    "cpu":     { "pollMs": 15000,  "threshold": 80    },  // CPU % threshold
    "ram":     { "pollMs": 30000,  "threshold": 85    },  // RAM % threshold
    "cputemp": { "pollMs": 30000,  "threshold": 80    },  // °C threshold
    "idle":    { "pollMs": 60000,  "thresholdSec": 1800 }, // idle seconds
    "disk":    { "pollMs": 600000, "thresholdPct": 10 },  // free % threshold
    "files":   { "pollMs": 300000, "largeFileBytes": 1073741824, "desktopClutterCount": 20 }
  }
}
```

---

## Tray menu

| Action | How |
|---|---|
| Toggle all reactions on/off | Left-click the icon |
| Open config file | Right-click → Open config… |
| Toggle launch at login | Right-click → Launch at login |
| Quit | Right-click → Quit WALL-E |

---

## Build from source

**Requirements:** Xcode Command Line Tools (`xcode-select --install`), Node.js ≥ 18.

```bash
git clone https://github.com/shuwarida/wall-e.git
cd wall-e
npm install

# Dev mode — runs Swift UI + Node daemon from source (no bundling)
npm run dev

# Build distributable .app (host arch only)
npm run build:app

# Build universal .app (arm64 + x86_64)
npm run build:app:universal

# Build universal .app + DMG
npm run build:dmg
```

The built app lands in `dist/WallE.app`. Open it with `open dist/WallE.app`.

### Project layout

```
index.js               — daemon entry point
src/
  config.js            — config file singleton (load / watch / defaults)
  react.js             — single gating point for all event reactions
  sounds.js            — WAV synthesis + afplay playback queue
  debounce.js          — per-event cooldown system
  utils.js             — shared helpers
  monitors/            — one file per event category (24 monitors)
swift/
  Sources/WallE/
    AppDelegate.swift  — app lifecycle, spawns Node child process
    NodeChild.swift    — manages Node subprocess, parses EVENT lines from stdout
    TrayController.swift — NSStatusItem + menu
    FaceIcon.swift     — animated face icon (blink / react / sleep states)
    Config.swift       — reads/writes config.json, watches for changes
    LoginItem.swift    — SMAppService login item registration
scripts/
  build-app.sh         — assembles WallE.app bundle + optional DMG
  dev.sh               — dev mode launcher
```

### How Swift and Node talk

- **Swift → Node**: Swift writes `config.json`; Node watches it with `fs.watchFile` and applies changes immediately.
- **Node → Swift**: Node writes `EVENT reaction <key>` lines to stdout; Swift reads them via `Pipe` and triggers the face animation.

---

## Legacy LaunchAgent

If you previously ran WALL-E as a `launchctl` agent via `com.wall-e.app.plist`, the app will detect it on first launch and offer to remove it automatically.

To remove it manually:
```bash
launchctl unload ~/Library/LaunchAgents/com.wall-e.app.plist
rm ~/Library/LaunchAgents/com.wall-e.app.plist
```

---

## License

MIT
