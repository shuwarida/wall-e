'use strict';

const { spawnSync } = require('child_process');
const { react } = require('../react');

let terminalWasRunning = false;
let claudeWasRunning = false;
let spotifyState = null; // 'playing' | 'paused' | 'stopped' | null
let spotifyTrack = null;

function isRunning(name) {
  return spawnSync('pgrep', ['-x', name], { encoding: 'utf8' }).status === 0;
}

function isRunningF(pattern) {
  return spawnSync('pgrep', ['-f', pattern], { encoding: 'utf8' }).status === 0;
}

function getSpotifyState() {
  if (!isRunning('Spotify')) return null;
  const r = spawnSync('osascript', ['-e', 'tell application "Spotify" to get player state'], {
    encoding: 'utf8', timeout: 2000,
  });
  if (r.error || r.status !== 0) return null;
  return r.stdout.trim().toLowerCase(); // 'playing', 'paused', 'stopped'
}

function getSpotifyTrack() {
  const r = spawnSync('osascript', ['-e', 'tell application "Spotify" to get name of current track'], {
    encoding: 'utf8', timeout: 2000,
  });
  if (r.error || r.status !== 0) return null;
  return r.stdout.trim();
}

function checkApps() {
  // Terminal
  const termRunning = isRunning('Terminal') || isRunning('iTerm2') || isRunning('Alacritty');
  if (!terminalWasRunning && termRunning) {
    react('terminal-open', 'terminal_open.wav', 'Terminal opened');
  }
  terminalWasRunning = termRunning;

  // Claude Code
  const claudeRunning = isRunningF('claude');
  if (!claudeWasRunning && claudeRunning) {
    react('claude-open', 'claude_open.wav', 'Claude is ready');
  }
  claudeWasRunning = claudeRunning;

  // Spotify
  const newState = getSpotifyState();
  if (spotifyState !== null && newState !== spotifyState) {
    if (newState === 'playing') {
      react('spotify-play', 'spotify_on.wav', 'Music playing');
    } else if ((newState === 'paused' || newState === 'stopped') && spotifyState === 'playing') {
      react('spotify-stop', 'spotify_off.wav', 'Music paused');
    }
  }
  spotifyState = newState;

  // Track change
  if (newState === 'playing') {
    const track = getSpotifyTrack();
    if (track && track !== spotifyTrack && spotifyTrack !== null) {
      react('spotify-track', 'spotify_next.wav', `Now playing: ${track}`);
    }
    spotifyTrack = track;
  }
}

function startAppsMonitor() {
  // Establish baseline without firing on startup
  terminalWasRunning = isRunning('Terminal') || isRunning('iTerm2') || isRunning('Alacritty');
  claudeWasRunning = isRunningF('claude');
  spotifyState = getSpotifyState();
  spotifyTrack = spotifyState === 'playing' ? getSpotifyTrack() : null;

  setInterval(checkApps, 5000);
}

module.exports = { startAppsMonitor };
