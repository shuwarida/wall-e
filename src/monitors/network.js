'use strict';

const net = require('net');
const { react } = require('../react');

let wasOnline = true;
let initialized = false;
let checking = false;

function checkConnectivity(callback) {
  // TCP connect to Cloudflare DNS — real network request, no OS cache
  const socket = net.createConnection({ host: '1.1.1.1', port: 53, timeout: 3000 });
  socket.on('connect', () => { socket.destroy(); callback(true); });
  socket.on('error', () => { socket.destroy(); callback(false); });
  socket.on('timeout', () => { socket.destroy(); callback(false); });
}

function checkNetwork() {
  if (checking) return;
  checking = true;

  checkConnectivity((isOnline) => {
    checking = false;

    if (!initialized) {
      wasOnline = isOnline;
      initialized = true;
      return;
    }

    if (wasOnline && !isOnline) {
      react('network-lost', 'net_lost.wav', 'No internet connection');
    } else if (!wasOnline && isOnline) {
      react('network-restored', 'net_ok.wav', 'Back online');
    }

    wasOnline = isOnline;
  });
}

function startNetworkMonitor() {
  checkNetwork();
  setInterval(checkNetwork, 10000);
}

module.exports = { startNetworkMonitor };
