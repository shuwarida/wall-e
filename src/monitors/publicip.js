'use strict';

const https = require('https');
const { react } = require('../react');

let prevIp = null;

function getPublicIp(callback) {
  const req = https.get('https://api.ipify.org?format=json', { timeout: 5000 }, (res) => {
    let data = '';
    res.on('data', d => { data += d; });
    res.on('end', () => {
      try { callback(JSON.parse(data).ip || null); }
      catch (_) { callback(null); }
    });
  });
  req.on('error', () => callback(null));
  req.on('timeout', () => { req.destroy(); callback(null); });
}

function checkPublicIp() {
  getPublicIp((ip) => {
    if (!ip) return;
    if (prevIp === null) { prevIp = ip; return; }
    if (ip !== prevIp) {
      react('publicip', 'ip_new.wav', `Public IP changed: ${ip}`);
    }
    prevIp = ip;
  });
}

function startPublicIpMonitor() {
  checkPublicIp();
  setInterval(checkPublicIp, 5 * 60 * 1000);
}

module.exports = { startPublicIpMonitor };
