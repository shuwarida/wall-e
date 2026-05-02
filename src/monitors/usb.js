'use strict';

const { spawnSync } = require('child_process');
const { react } = require('../react');

let prevCount = null;

function getUsbDeviceCount() {
  const result = spawnSync('ioreg', ['-r', '-c', 'IOUSBDevice'], {
    encoding: 'utf8',
    timeout: 3000,
    maxBuffer: 512 * 1024,
  });
  if (result.error || result.status !== 0) return null;
  return (result.stdout.match(/"USB Product Name"/g) || []).length;
}

function checkUsb() {
  const count = getUsbDeviceCount();
  if (count === null) return;

  if (prevCount === null) {
    prevCount = count;
    return;
  }

  if (count > prevCount) {
    react('usb-add', 'usb_in.wav', 'USB device connected');
  } else if (count < prevCount) {
    react('usb-remove', 'usb_out.wav', 'USB device removed');
  }

  prevCount = count;
}

function startUsbMonitor() {
  checkUsb();
  setInterval(checkUsb, 1000);
}

module.exports = { startUsbMonitor };
