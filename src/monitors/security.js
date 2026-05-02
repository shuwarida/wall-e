'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { react } = require('../react');

const LAUNCH_AGENTS_DIR = path.join(os.homedir(), 'Library', 'LaunchAgents');

let knownAgents = null;
let cameraWasActive = false;
let micWasActive = false;

function isCameraActive() {
  // VDCAssistant runs when any app uses the camera
  return spawnSync('pgrep', ['VDCAssistant'], { encoding: 'utf8' }).status === 0;
}

function isMicActive() {
  // Check if coreaudiod has active input streams via IOAudioDevice
  const r = spawnSync('ioreg', ['-r', '-c', 'IOAudioDevice', '-l'], {
    encoding: 'utf8', timeout: 2000, maxBuffer: 256 * 1024,
  });
  if (r.error) return false;
  // Input streams present and active means mic is in use
  return r.stdout.includes('"IOAudioDeviceInputs"') &&
         r.stdout.includes('"IOAudioStreamStartingChannelNumberInput"');
}

function getLaunchAgents() {
  try { return new Set(fs.readdirSync(LAUNCH_AGENTS_DIR)); }
  catch (_) { return new Set(); }
}

function checkSecurity() {
  // Camera
  const cameraActive = isCameraActive();
  if (cameraActive && !cameraWasActive) {
    react('camera-on', 'cam_on.wav', 'Camera activated');
  }
  cameraWasActive = cameraActive;

  // Microphone
  const micActive = isMicActive();
  if (micActive && !micWasActive) {
    react('mic-on', 'mic_on.wav', 'Microphone activated');
  }
  micWasActive = micActive;

  // New LaunchAgent
  const agents = getLaunchAgents();
  if (knownAgents !== null) {
    for (const a of agents) {
      if (!knownAgents.has(a) && react('launchagent-new', 'agent_new.wav', `New LaunchAgent: ${a}`)) {
        break;
      }
    }
  }
  knownAgents = agents;
}

function startSecurityMonitor() {
  cameraWasActive = isCameraActive();
  micWasActive = isMicActive();
  knownAgents = getLaunchAgents();

  setInterval(checkSecurity, 10000);
}

module.exports = { startSecurityMonitor };
