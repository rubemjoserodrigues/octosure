/**
 * App logger: one file per run in project /logs folder.
 * Logs backend traffic, user interactions, and general events for fast debugging.
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LEVELS = ['debug', 'info', 'warn', 'error'];

let logFilePath = null;
let writeQueue = Promise.resolve();

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function startSession() {
  ensureLogDir();
  const now = new Date();
  const name = `session_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.log`;
  logFilePath = path.join(LOG_DIR, name);

  const header = `\n${'='.repeat(80)}\n[SESSION START] ${now.toISOString()}\n${'='.repeat(80)}\n`;
  fs.appendFileSync(logFilePath, header);

  return logFilePath;
}

function safeStringify(obj, maxLen = 2000) {
  if (obj === undefined) return 'undefined';
  if (obj === null) return 'null';
  try {
    let s = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 0);
    if (s.length > maxLen) s = s.slice(0, maxLen) + '...[truncated]';
    return s;
  } catch (_) {
    return String(obj).slice(0, maxLen);
  }
}

function formatLine(level, category, message, data) {
  const ts = new Date().toISOString();
  const cat = category ? `[${category}]` : '';
  const levelTag = `[${(level || 'info').toUpperCase()}]`;
  let line = `${ts} ${levelTag} ${cat} ${message}`;
  if (data !== undefined && data !== null && data !== '') {
    // Use larger limit for errors so stack traces and full error payloads are captured
    const maxLen = (level || '').toLowerCase() === 'error' ? 8000 : 2000;
    const extra = typeof data === 'object' ? safeStringify(data, maxLen) : String(data).slice(0, maxLen);
    line += ` | ${extra}`;
  }
  return line + '\n';
}

function write(level, category, message, data) {
  if (!logFilePath) return;
  const normLevel = LEVELS.includes(String(level).toLowerCase()) ? level : 'info';
  const line = formatLine(normLevel, category, message, data);

  writeQueue = writeQueue.then(() => {
    return new Promise((resolve, reject) => {
      fs.appendFile(logFilePath, line, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }).catch((err) => {
    console.error('[Logger] write failed:', err);
  });
}

module.exports = {
  startSession,
  write,
  getLogDir: () => LOG_DIR,
  getLogFilePath: () => logFilePath,
};
