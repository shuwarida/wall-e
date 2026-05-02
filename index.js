'use strict';

const config = require('./src/config');
config.load();
config.watch();

const { generateAllSounds } = require('./src/sounds');
const { startNetworkMonitor }    = require('./src/monitors/network');
const { startCpuMonitor }        = require('./src/monitors/cpu');
const { startBatteryMonitor }    = require('./src/monitors/battery');
const { startScreenLockMonitor } = require('./src/monitors/screenlock');
const { startUsbMonitor }        = require('./src/monitors/usb');
const { startDiskMonitor }       = require('./src/monitors/disk');
const { startIdleMonitor }       = require('./src/monitors/idle');
const { startSleepMonitor }      = require('./src/monitors/sleep');
const { startCrashMonitor }      = require('./src/monitors/crash');
const { startVpnMonitor }        = require('./src/monitors/vpn');
const { startWifiMonitor }       = require('./src/monitors/wifi');
const { startRamMonitor }        = require('./src/monitors/ram');
const { startDisplayMonitor }    = require('./src/monitors/display');
const { startBluetoothMonitor }  = require('./src/monitors/bluetooth');
const { startCpuTempMonitor }    = require('./src/monitors/cputemp');
const { startPublicIpMonitor }   = require('./src/monitors/publicip');
const { startDownloadsMonitor }  = require('./src/monitors/downloads');
const { startTimeMonitor }       = require('./src/monitors/timeevents');
const { startAppsMonitor }       = require('./src/monitors/apps');
const { startScreenshotMonitor } = require('./src/monitors/screenshot');
const { startFilesMonitor }      = require('./src/monitors/files');
const { startSecurityMonitor }   = require('./src/monitors/security');
const { startCapsLockMonitor }   = require('./src/monitors/capslock');
const { startRandomMonitor }     = require('./src/monitors/random');

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT',  () => process.exit(0));
process.on('uncaughtException', (e) => {
  process.stderr.write('[wall-e] uncaughtException: ' + e.message + '\n');
});

async function main() {
  generateAllSounds();

  startNetworkMonitor();
  startCpuMonitor();
  startBatteryMonitor();
  startScreenLockMonitor();
  startUsbMonitor();
  startDiskMonitor();
  startIdleMonitor();
  startSleepMonitor();
  startCrashMonitor();
  startVpnMonitor();
  startWifiMonitor();
  startRamMonitor();
  startDisplayMonitor();
  startBluetoothMonitor();
  startCpuTempMonitor();
  startPublicIpMonitor();
  startDownloadsMonitor();
  startTimeMonitor();
  startAppsMonitor();
  startScreenshotMonitor();
  startFilesMonitor();
  startSecurityMonitor();
  startCapsLockMonitor();
  startRandomMonitor();

  process.stdin.resume();
}

main().catch((e) => {
  process.stderr.write('[wall-e] fatal: ' + e.message + '\n');
  process.exit(1);
});
