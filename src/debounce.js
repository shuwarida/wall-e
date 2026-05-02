'use strict';

const COOLDOWNS = {
  'network-lost':          60 * 1000,
  'network-restored':      60 * 1000,
  'cpu':              5 * 60 * 1000,
  'cputemp':          5 * 60 * 1000,
  'ram':              5 * 60 * 1000,
  'battery-low':     10 * 60 * 1000,
  'battery-full':    30 * 60 * 1000,
  'battery-1':            30 * 1000,
  'battery-2':            30 * 1000,
  'battery-3':            30 * 1000,
  'battery-4':            30 * 1000,
  'battery-5':        2 * 60 * 1000,
  'battery-10':       5 * 60 * 1000,
  'battery-15':       5 * 60 * 1000,
  'battery-20':      10 * 60 * 1000,
  'charger-on':           30 * 1000,
  'charger-off':          30 * 1000,
  'screenlock-unlock':    10 * 1000,
  'screenlock-lock':      10 * 1000,
  'usb-add':              10 * 1000,
  'usb-remove':           10 * 1000,
  'display-add':          10 * 1000,
  'display-remove':       10 * 1000,
  'bluetooth-add':        10 * 1000,
  'bluetooth-remove':     10 * 1000,
  'disk':            30 * 60 * 1000,
  'idle':            30 * 60 * 1000,
  'sleep-wake':           30 * 1000,
  'app-crash':        2 * 60 * 1000,
  'vpn-on':               30 * 1000,
  'vpn-off':              30 * 1000,
  'wifi-change':          30 * 1000,
  'publicip':         5 * 60 * 1000,
  'download-done':         5 * 1000,
  'morning':         12 * 60 * 60 * 1000,
  'evening':         12 * 60 * 60 * 1000,
  'night':           12 * 60 * 60 * 1000,
  'lunch':           12 * 60 * 60 * 1000,
  'chime':           50 * 60 * 1000,
  'overtime':         2 * 60 * 60 * 1000,
  'terminal-open':        30 * 1000,
  'claude-open':          30 * 1000,
  'spotify-play':         30 * 1000,
  'spotify-stop':         30 * 1000,
  'spotify-track':        15 * 1000,
  'screenshot':            5 * 1000,
  'large-file':            5 * 60 * 1000,
  'desktop-clutter':  30 * 60 * 1000,
  'trash-full':       30 * 60 * 1000,
  'trash-emptied':    30 * 60 * 1000,
  'sudo':             60 * 1000,
  'launchagent-new':  60 * 1000,
  'camera-on':        30 * 1000,
  'camera-off':       30 * 1000,
  'mic-on':           30 * 1000,
  'mic-off':          30 * 1000,
  'capslock-on':       5 * 1000,
  'capslock-off':      5 * 1000,
  'random':           2 * 60 * 60 * 1000,
  'mouse-idle':      30 * 60 * 1000,
};

const lastFired = {};

function canFire(eventKey, overrideMs) {
  const now = Date.now();
  const cooldown = (typeof overrideMs === 'number' && overrideMs >= 0)
    ? overrideMs
    : (COOLDOWNS[eventKey] || 5 * 60 * 1000);
  if (!lastFired[eventKey] || (now - lastFired[eventKey]) >= cooldown) {
    lastFired[eventKey] = now;
    return true;
  }
  return false;
}

module.exports = { canFire, COOLDOWNS };
