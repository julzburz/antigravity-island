const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onAgentUpdate: (callback) => {
    ipcRenderer.on('agent-update', (event, data) => callback(data));
  },
  onCursorMove: (callback) => {
    ipcRenderer.on('global-cursor', (event, data) => callback(data));
  },
  onWindowBlur: (callback) => {
    ipcRenderer.on('window-blur', () => callback());
  },
  getAgentState: () => ipcRenderer.invoke('get-agent-state'),
  setIgnoreMouseEvents: (ignore) => {
    ipcRenderer.send('set-ignore-mouse-events', ignore);
  },
  switchSession: (sessionId) => {
    ipcRenderer.send('switch-session', sessionId);
  },
  quitApp: () => {
    ipcRenderer.send('quit-app');
  },
  minimizeApp: () => {
    ipcRenderer.send('minimize-app');
  },
  clearDoneStatus: () => {
    ipcRenderer.send('clear-done-status');
  }
});
