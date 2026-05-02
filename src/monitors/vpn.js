'use strict';

const { spawnSync } = require('child_process');
const { react } = require('../react');

let prevConnected = null;

function getVpnConnected() {
  const result = spawnSync('scutil', ['--nc', 'list'], {
    encoding: 'utf8',
    timeout: 3000,
  });
  if (result.error || result.status !== 0) return false;
  return result.stdout.includes('(Connected)');
}

function checkVpn() {
  const isConnected = getVpnConnected();

  if (prevConnected === null) {
    prevConnected = isConnected;
    return;
  }

  if (!prevConnected && isConnected) {
    react('vpn-on', 'vpn_on.wav', 'VPN connected');
  } else if (prevConnected && !isConnected) {
    react('vpn-off', 'vpn_off.wav', 'VPN disconnected');
  }

  prevConnected = isConnected;
}

function startVpnMonitor() {
  checkVpn();
  setInterval(checkVpn, 15000);
}

module.exports = { startVpnMonitor };
