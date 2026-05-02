# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WALL-E is a macOS background daemon (Node.js) that plays synthesized sounds in response to system events — battery changes, USB connections, screen lock/unlock, network state, app launches, security events, and more.

## Commands

```bash
npm start                 # run the daemon directly (foreground)
npm run install-agent     # install as a launchd LaunchAgent (auto-start on login)
npm run uninstall-agent   # remove the LaunchAgent
```

**Logs** (when running as a LaunchAgent):
```
~/Library/Logs/wall-e/stdout.log
~/Library/Logs/wall-e/stderr.log
```

**Restart after changes** (if running as a LaunchAgent):
```bash
launchctl unload ~/Library/LaunchAgents/com.wall-e.app.plist
launchctl load   ~/Library/LaunchAgents/com.wall-e.app.plist
```

## Architecture

```
index.js               — entry point: acquires PID lock, starts all monitors
src/
  sounds.js            — WAV synthesis + playback queue
  debounce.js          — per-event cooldown system
  utils.js             — shared helpers
  monitors/            — one file per event category
```

### Startup sequence (`index.js`)

1. Write `wall-e.lock` (PID file); exit if another instance is already running
2. Call `generateAllSounds()` — synthesizes all `.wav` files into `sounds/` at startup
3. Call every `start*Monitor()` — each sets up a `setInterval` polling loop
4. Call `process.stdin.resume()` to keep the process alive

### Sound synthesis (`src/sounds.js`)

All sounds are generated programmatically at startup from pure math — no bundled audio assets are required. The primitives are:

- `sine(freq, dur, amp, ar, rr)` — simple sine wave with attack/release envelope
- `sweep(f0, f1, dur, amp, ar, rr)` — linear frequency sweep
- `vib(f, dur, amp, depth, rate, ar, rr)` — vibrato
- `trill(f1, f2, dur, amp, rate, ar, rr)` — alternating-frequency trill
- `sil(ms)` — silence gap
- `save(filename, ...segs)` — concatenates segments and writes a 16-bit mono WAV

Playback uses macOS `afplay`. There is a single-slot queue: if a sound is already playing, the newest requested sound replaces the pending slot (only the next sound is remembered, not a full queue). macOS notifications are sent via `osascript`.

### Debounce / cooldown (`src/debounce.js`)

Every event has a named key and a minimum interval before it can fire again. Before playing a sound, a monitor calls `canFire(eventKey)`. Cooldowns range from 5 s (screenshot) to 12 h (morning/evening/night/lunch greetings). Add new event keys to the `COOLDOWNS` map in this file.

### Adding a new monitor

1. Create `src/monitors/myevent.js` exporting `startMyEventMonitor()`
2. Inside, poll with `setInterval`, call `canFire('my-event-key')` before `playSound('sound.wav', 'Notification text')`
3. Add `'my-event-key'` with its cooldown to `COOLDOWNS` in `src/debounce.js`
4. Add the sound generation call to `gen()` in `src/sounds.js`
5. Import and call `startMyEventMonitor()` in `index.js`

### macOS system integration

Monitors use native macOS tools (no external npm packages beyond `systeminformation`):
- `ioreg` — idle time, USB/display/audio devices
- `pgrep` / `launchctl` / `scutil` — process detection, VPN state, network info
- `pmset` — sleep/wake events
- `log stream` — app crash detection via unified logging
- `fs.watch` / `fs.readdirSync` — file system events (Downloads, Desktop, Trash, Screenshots, LaunchAgents)
- `systeminformation` npm package — CPU, RAM, battery, network, Wi-Fi, disk, Bluetooth
