const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('polvo', {
    navigateToLogin: () => ipcRenderer.send('navigate-to-login'),
    navigateToDashboard: () => ipcRenderer.send('navigate-to-dashboard'),
    minimizeApp: () => ipcRenderer.send('window-minimize'),
    maximizeApp: () => ipcRenderer.send('window-maximize'),
    forceMaximizeApp: () => ipcRenderer.send('window-force-maximize'),
    closeApp: () => ipcRenderer.send('window-close'),
    onMaximizeChange: (callback) => ipcRenderer.on('maximize-change', (_event, isMaximized) => callback(isMaximized)),
    getSocketConfig: () => ipcRenderer.invoke('get-socket-config'),
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),
    setSocketToken: (token, url) => ipcRenderer.invoke('set-socket-token', { token, url }),
    clearSocketToken: () => ipcRenderer.invoke('clear-socket-token'),
    getAppUpdateState: () => ipcRenderer.invoke('app-update-get-state'),
    checkAppUpdateNow: () => ipcRenderer.invoke('app-update-check-now'),
    restartToApplyUpdate: () => ipcRenderer.invoke('app-update-restart-install'),
    onAppUpdateStatus: (callback) => {
        if (typeof callback !== 'function') return () => {};
        const handler = (_event, payload) => callback(payload || {});
        ipcRenderer.on('app-update-status', handler);
        return () => ipcRenderer.removeListener('app-update-status', handler);
    },
    onAppUpdateReady: (callback) => {
        if (typeof callback !== 'function') return () => {};
        const handler = (_event, payload) => callback(payload || {});
        ipcRenderer.on('app-update-ready', handler);
        return () => ipcRenderer.removeListener('app-update-ready', handler);
    },
    openBetWindows: (payload) => ipcRenderer.send('open-bet-windows', payload || {}),
    primeBetWindows: (payload) => ipcRenderer.send('prime-bet-windows', payload || {}),
    toggleDetachedLayout: (mode) => ipcRenderer.send('toggle-detached-layout', { mode }),
    closeBetWindows: () => ipcRenderer.send('close-bet-windows'),
    controlBetWindow: (side, action) => ipcRenderer.send('control-bet-window', { side, action }),
    onBetanoOddUpdate: (callback) => {
        if (typeof callback !== 'function') return () => {};
        const handler = (_event, payload) => callback(payload || {});
        ipcRenderer.on('betano-odd-update', handler);
        return () => ipcRenderer.removeListener('betano-odd-update', handler);
    },
    /** Debug log: level = debug|info|warn|error, category = e.g. USER|BACKEND|SOCKET, message, optional data */
    log: (level, category, message, data) => ipcRenderer.invoke('log', { level, category, message, data }),
});
