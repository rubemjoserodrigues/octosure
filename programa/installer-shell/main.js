const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');

const PRODUCT_VERSION = app.getVersion();
const FEED_URL = 'https://octosure.net/updates/latest.yml';
const INSTALLER_NAME = `Octosure Setup ${PRODUCT_VERSION}.exe`;
const LOCAL_APP_DATA = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const APP_EXE_CANDIDATES = [
  path.join(LOCAL_APP_DATA, 'Programs', 'octosure', 'Octosure.exe'),
  path.join(LOCAL_APP_DATA, 'Programs', 'Octosure', 'Octosure.exe'),
];

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 760,
    height: 520,
    minWidth: 720,
    minHeight: 500,
    frame: false,
    resizable: false,
    backgroundColor: '#070b12',
    icon: path.join(__dirname, '..', 'src', 'assets', 'iconeapp.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setTitle('Octosure Instalador');

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.handle('window:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.handle('window:close', () => {
  app.quit();
});

ipcMain.handle('install:start', async (event) => {
  const send = (payload) => event.sender.send('install:progress', payload);
  try {
    send({ stage: 'Preparando instalacao', percent: 4 });
    const setupPath = await resolveSetupPath(send);
    send({ stage: 'Instalando Octosure', percent: 82 });
    await runSilentInstaller(setupPath, send);
    send({ stage: 'Instalacao concluida', percent: 100, done: true });
    return { ok: true };
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    send({ stage: 'Falha na instalacao', error: message });
    return { ok: false, message };
  }
});

ipcMain.handle('install:open-app', async () => {
  const appExe = findInstalledApp();
  if (appExe) {
    spawn(appExe, [], { detached: true, stdio: 'ignore' }).unref();
    app.quit();
    return true;
  }
  await shell.openPath(path.join(LOCAL_APP_DATA, 'Programs'));
  return false;
});

function resolveSetupPath(send) {
  const besideInstaller = path.join(path.dirname(process.execPath), INSTALLER_NAME);
  if (fs.existsSync(besideInstaller)) {
    send({ stage: 'Instalador local encontrado', percent: 12 });
    return Promise.resolve(besideInstaller);
  }

  const bundledSetup = findSetupInDir(path.join(process.resourcesPath || '', 'setup'));
  if (bundledSetup) {
    send({ stage: 'Instalador embutido encontrado', percent: 12 });
    return Promise.resolve(bundledSetup);
  }

  const devSetup = findSetupInDir(path.join(__dirname, '..', 'dist'));
  if (devSetup) {
    send({ stage: 'Instalador local encontrado', percent: 12 });
    return Promise.resolve(devSetup);
  }

  return getLatestInstallerUrl()
    .then((url) => {
      const target = path.join(app.getPath('temp'), INSTALLER_NAME);
      return downloadFile(url, target, send);
    });
}

function findSetupInDir(dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) return '';
  const exact = path.join(dirPath, INSTALLER_NAME);
  if (fs.existsSync(exact)) return exact;
  try {
    const matches = fs.readdirSync(dirPath)
      .filter((name) => /^Octosure Setup .*\.exe$/i.test(name))
      .filter((name) => !name.includes('__uninstaller'))
      .map((name) => ({ name, stat: fs.statSync(path.join(dirPath, name)) }))
      .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
    if (matches[0]) return path.join(dirPath, matches[0].name);
  } catch (_) {}
  return '';
}

function getLatestInstallerUrl() {
  return new Promise((resolve, reject) => {
    https.get(FEED_URL, { headers: { 'Cache-Control': 'no-cache' } }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`Servidor de atualizacao respondeu HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const pathMatch = body.match(/^path:\s*(.+)$/m);
        const fileName = pathMatch ? pathMatch[1].trim().replace(/^['"]|['"]$/g, '') : INSTALLER_NAME;
        resolve(`https://octosure.net/updates/${encodeURIComponent(fileName).replace(/%20/g, '%20')}`);
      });
    }).on('error', reject);
  });
}

function downloadFile(url, target, send) {
  return new Promise((resolve, reject) => {
    send({ stage: 'Baixando instalador', percent: 16 });
    const file = fs.createWriteStream(target);
    https.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        file.close();
        fs.rm(target, { force: true }, () => {});
        reject(new Error(`Download respondeu HTTP ${res.statusCode}`));
        res.resume();
        return;
      }
      const total = Number(res.headers['content-length'] || 0);
      let received = 0;
      res.on('data', (chunk) => {
        received += chunk.length;
        if (total > 0) {
          const percent = 16 + Math.round((received / total) * 62);
          send({ stage: 'Baixando instalador', percent: Math.min(78, percent) });
        }
      });
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(target));
      });
    }).on('error', (error) => {
      file.close();
      fs.rm(target, { force: true }, () => {});
      reject(error);
    });
  });
}

async function runSilentInstaller(setupPath, send) {
  const before = findInstalledApp();
  if (send) send({ stage: 'Fechando Octosure aberto', percent: 80 });
  await closeRunningOctosure();
  if (send) send({ stage: 'Instalando Octosure', percent: 84 });
  const code = await runInstallerProcess(setupPath, ['/S']);
  if (code === 0) return;
  await sleep(1800);
  if (findInstalledApp()) {
    if (send) send({ stage: before ? 'Octosure atualizado' : 'Octosure instalado', percent: 96 });
    return;
  }
  throw new Error(`O instalador oficial nao concluiu a instalacao. Codigo ${code}.`);
}

function runInstallerProcess(setupPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(setupPath, args, {
      windowsHide: true,
      stdio: 'ignore',
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve(Number(code || 0)));
  });
}

function closeRunningOctosure() {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    try {
      const child = spawn('taskkill', ['/IM', 'Octosure.exe', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
      child.on('exit', finish);
      child.on('error', finish);
    } catch (_) {
      finish();
    }
    setTimeout(finish, 1800);
  });
}

function findInstalledApp() {
  return APP_EXE_CANDIDATES.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch (_) {
      return false;
    }
  }) || '';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
