'use strict';

const { react } = require('../react');

function startRandomMonitor() {
  setInterval(() => {
    react('random', 'bored.wav', 'WALL-E is bored...');
  }, 2 * 60 * 60 * 1000);
}

module.exports = { startRandomMonitor };
