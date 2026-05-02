'use strict';

const { spawn } = require('child_process');
const { react } = require('../react');

let prevConnected = null;

function getConnectedDevices(callback) {
  const chunks = [];
  const proc = spawn('system_profiler', ['SPBluetoothDataType', '-json'], { stdio: ['ignore', 'pipe', 'ignore'] });
  proc.stdout.on('data', d => chunks.push(d));
  proc.on('close', () => {
    try {
      const data = JSON.parse(Buffer.concat(chunks).toString());
      const connected = new Set();
      const entries = data?.SPBluetoothDataType?.[0]?.device_connected || [];
      for (const device of entries) {
        const name = Object.keys(device)[0];
        if (name) connected.add(name);
      }
      callback(connected);
    } catch (_) { callback(new Set()); }
  });
  proc.on('error', () => callback(new Set()));
}

function checkBluetooth() {
  getConnectedDevices((connected) => {
    if (prevConnected === null) { prevConnected = connected; return; }

    for (const d of connected) {
      if (!prevConnected.has(d) && react('bluetooth-add', 'bt_in.wav', 'Bluetooth device connected')) {
        break;
      }
    }
    for (const d of prevConnected) {
      if (!connected.has(d) && react('bluetooth-remove', 'bt_out.wav', 'Bluetooth device disconnected')) {
        break;
      }
    }
    prevConnected = connected;
  });
}

function startBluetoothMonitor() {
  checkBluetooth();
  setInterval(checkBluetooth, 10000);
}

module.exports = { startBluetoothMonitor };
