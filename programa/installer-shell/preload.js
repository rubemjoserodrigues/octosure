const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('octosureInstaller', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  start: () => ipcRenderer.invoke('install:start'),
  openApp: () => ipcRenderer.invoke('install:open-app'),
  onProgress: (callback) => {
    ipcRenderer.on('install:progress', (_, payload) => callback(payload));
  },
});
