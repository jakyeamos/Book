#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const source = process.env.AUDIO_ASSET_DIR;
if (!source || !fs.existsSync(source)) {
  console.error("AUDIO_ASSET_DIR must point to an existing directory");
  process.exit(1);
}

const backupDir = process.env.BACKUP_DIR || path.join("backups", "audio");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupDir, `audio-${stamp}`);
fs.cpSync(source, target, { recursive: true });
console.log(target);
