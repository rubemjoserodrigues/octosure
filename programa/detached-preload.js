const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('detachedApi', {
    onLoadPayload: (callback) => {
        if (typeof callback !== 'function') return () => {};
        const handler = (_event, payload) => callback(payload || {});
        ipcRenderer.on('detached-load', handler);
        return () => ipcRenderer.removeListener('detached-load', handler);
    },
    windowAction: (action) => ipcRenderer.send('detached-window-control', { action }),
    copyText: (text) => ipcRenderer.invoke('detached-copy-text', { text: String(text || '') }),
    notifyUiReady: (payload = {}) => ipcRenderer.send('detached-ui-ready', payload),
});
