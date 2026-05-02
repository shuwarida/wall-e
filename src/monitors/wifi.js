'use strict';

const { spawnSync } = require('child_process');
const { react } = require('../react');

let prevSsid = null;

function getCurrentSsid() {
  const result = spawnSync('networksetup', ['-getairportnetwork', 'en0'], {
    encoding: 'utf8',
    timeout: 3000,
  });
  if (result.error || result.status !== 0) return null;
  const match = result.stdout.match(/Current Wi-Fi Network:\s*(.+)/);
  return match ? match[1].trim() : null;
}

function checkWifi() {
  const ssid = getCurrentSsid();
  if (ssid && ssid !== prevSsid) {
    react('wifi-change', 'wifi_new.wav', `Wi-Fi: ${ssid}`);
  }
  prevSsid = ssid;
}

function startWifiMonitor() {
  prevSsid = getCurrentSsid();
  setInterval(checkWifi, 15000);
}

module.exports = { startWifiMonitor };
