const { app, BrowserWindow, screen, ipcMain, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { exec } = require('child_process');

let mainWindow = null;
let tray = null;
let watcherInterval = null;
let cursorInterval = null;
let activeSessionId = null;
let activeSessionFullId = null;
let lastTranscriptPath = null;
let lastFileSize = 0;
let lastFileMtime = 0;

const sessionTitlesCache = new Map();
let lastSummariesDbMtime = 0;
let cachedRecentSessions = [];
let lastSessionsScan = 0;

// Estado del agente Antigravity
let agentState = {
  status: 'idle', // 'idle' | 'thinking' | 'read' | 'edit' | 'bash' | 'done' | 'waiting' | 'error' | 'dizzy' | 'cancelled'
  title: 'Antigravity 2.0',
  sessionName: 'Cargando chat...',
  sessionId: '',
  stepIndex: 0,
  activeFile: 'workspace',
  fileLang: 'ts',
  codeSnippet: '// En espera de sesión...',
  diffLines: [],
  toolAction: 'Listo para programar',
  responseContent: '',
  lastUserPrompt: '',
  chatHistory: [],
  checklist: {
    read: false,
    edit: false,
    bash: false,
    done: false
  },
  pendingApproval: null,
  subagents: [], // [{ id, role, type, status }]
  activeSessions: [], // [{ id, shortId, title, mtime, status }]
  activeWorkingCount: 0,
  timestamp: Date.now()
};

function syncSessionTitlesFromDb() {
  const dbPath = path.join(os.homedir(), '.gemini', 'antigravity', 'conversation_summaries.db');
  if (!fs.existsSync(dbPath)) return;
  try {
    const stats = fs.statSync(dbPath);
    if (stats.mtimeMs === lastSummariesDbMtime && sessionTitlesCache.size > 0) return;
    lastSummariesDbMtime = stats.mtimeMs;
  } catch (e) {
    return;
  }

  const pyCmd = `python -c "import sqlite3, os, json; db = sqlite3.connect(os.path.expanduser('~/.gemini/antigravity/conversation_summaries.db')); rows = db.execute('''SELECT conversation_id, CASE WHEN title != '' THEN title ELSE preview END FROM conversation_summaries ORDER BY last_modified_time DESC LIMIT 40''').fetchall(); print(json.dumps(dict(rows)))"`;

  exec(pyCmd, { timeout: 3000, windowsHide: true }, (err, stdout) => {
    if (!err && stdout) {
      try {
        const data = JSON.parse(stdout.trim());
        let updated = false;
        for (const [id, title] of Object.entries(data)) {
          if (title && title.trim()) {
            sessionTitlesCache.set(id, title.trim());
            updated = true;
          }
        }
        if (updated && activeSessionFullId && sessionTitlesCache.has(activeSessionFullId)) {
          agentState.sessionName = sessionTitlesCache.get(activeSessionFullId);
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('agent-update', agentState);
          }
        }
      } catch (parseErr) {}
    }
  });
}

function getConversationTitle(convId, transcriptPath) {
  // 1. Chequear caché en memoria (instantáneo, 0 I/O)
  if (sessionTitlesCache.has(convId)) {
    return sessionTitlesCache.get(convId);
  }

  // 2. Extraer del transcript.jsonl con regex limpia
  try {
    if (transcriptPath && fs.existsSync(transcriptPath)) {
      const content = fs.readFileSync(transcriptPath, 'utf8');
      const firstLines = content.split('\n').slice(0, 15);
      for (const line of firstLines) {
        if (!line.trim()) continue;
        const entry = JSON.parse(line.trim());
        if (entry.source === 'USER_EXPLICIT' || entry.type === 'USER_INPUT') {
          let clean = extractCleanUserMessage(entry.content || '');
          if (clean) {
            clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            const firstLine = clean.split('\n')[0].replace(/^[#*`\-–—\s]+/, '').trim();
            if (firstLine && firstLine.length > 2) {
              const res = firstLine.slice(0, 45);
              sessionTitlesCache.set(convId, res);
              return res;
            }
          }
        }
      }
    }
  } catch (e) {}

  return '';
}

function getSessionQuickStatus(tPath, mtime) {
  if (!tPath || !fs.existsSync(tPath)) return 'idle';
  const timeSinceLastUpdate = Date.now() - mtime;
  if (timeSinceLastUpdate > 120000) return 'idle';

  try {
    const fd = fs.openSync(tPath, 'r');
    const stats = fs.fstatSync(fd);
    if (stats.size === 0) {
      fs.closeSync(fd);
      return 'idle';
    }
    const bufferSize = Math.min(2048, stats.size);
    const buffer = Buffer.alloc(bufferSize);
    fs.readSync(fd, buffer, 0, bufferSize, stats.size - bufferSize);
    fs.closeSync(fd);

    const lines = buffer.toString('utf8').trim().split('\n');
    const last = lines[lines.length - 1];
    if (!last) return 'idle';

    let entry;
    try {
      entry = JSON.parse(last);
    } catch (parseErr) {
      if (lines.length > 1) {
        try {
          entry = JSON.parse(lines[lines.length - 2]);
        } catch (e2) {}
      }
    }

    if (!entry) {
      return timeSinceLastUpdate < 15000 ? 'working' : 'idle';
    }

    const status = entry.status || '';
    const stepType = entry.type || '';
    const source = entry.source || '';
    const toolCalls = entry.tool_calls || [];

    if (status === 'ERROR') return 'error';
    if (status === 'CANCELLED' || status === 'ABORTED' || stepType === 'CANCELLED') return 'idle';

    if (source === 'USER_EXPLICIT' || stepType === 'USER_INPUT') {
      return timeSinceLastUpdate < 25000 ? 'thinking' : 'idle';
    }

    if (source === 'MODEL' && stepType === 'PLANNER_RESPONSE') {
      if (toolCalls && toolCalls.length > 0) {
        if (toolCalls[0].name === 'ask_question') {
          return 'waiting';
        }
        return 'working';
      }
      if (status === 'DONE') {
        return timeSinceLastUpdate < 25000 ? 'done' : 'idle';
      }
      return 'thinking';
    }

    if (status === 'DONE') {
      return timeSinceLastUpdate < 25000 ? 'done' : 'idle';
    }

    return timeSinceLastUpdate < 60000 ? 'working' : 'idle';
  } catch (e) {
    return timeSinceLastUpdate < 15000 ? 'working' : 'idle';
  }
}

function getRecentSessions() {
  const brainDir = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
  if (!fs.existsSync(brainDir)) return [];
  try {
    const dirs = fs.readdirSync(brainDir, { withFileTypes: true }).filter(d => d.isDirectory());
    const sessions = [];
    for (const d of dirs) {
      const transcriptPath = path.join(brainDir, d.name, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(transcriptPath)) {
        sessions.push({
          id: d.name,
          shortId: d.name.substring(0, 8),
          transcriptPath,
          mtime: fs.statSync(transcriptPath).mtimeMs
        });
      }
    }
    sessions.sort((a, b) => b.mtime - a.mtime);
    const top6 = sessions.slice(0, 6);

    for (const s of top6) {
      s.title = getConversationTitle(s.id, s.transcriptPath) || `Sesión ${s.shortId}`;
      s.status = getSessionQuickStatus(s.transcriptPath, s.mtime);
    }
    return top6;
  } catch (e) {
    return [];
  }
}

let manualSelectedSessionId = null;
let manualSelectedTime = 0;

function resolveActiveTranscript(sessions) {
  if (!sessions || sessions.length === 0) return null;

  // Si el usuario seleccionó una sesión manualmente:
  if (manualSelectedSessionId) {
    const isWithinManualLock = (Date.now() - manualSelectedTime) < 25000;
    if (!isWithinManualLock) {
      // Pasados 25s, si otra sesión tuvo actividad fresca posterior al click, auto-seguir:
      const newerSession = sessions.find(s => s.id !== manualSelectedSessionId && s.mtime > manualSelectedTime);
      if (newerSession) {
        manualSelectedSessionId = null;
        return newerSession.transcriptPath;
      }
    }
    const found = sessions.find(s => s.id === manualSelectedSessionId || s.shortId === manualSelectedSessionId);
    if (found) return found.transcriptPath;
  }

  return sessions[0].transcriptPath;
}

function extractCleanUserMessage(raw) {
  if (!raw) return '';
  const match = raw.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i);
  if (match) return match[1].trim();
  let cleaned = raw;
  cleaned = cleaned.replace(/<CONTEXT_SUMMARY>[\s\S]*?<\/CONTEXT_SUMMARY>/gi, '').trim();
  cleaned = cleaned.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/gi, '').trim();
  cleaned = cleaned.replace(/<[^>]+>/g, '').trim();
  return cleaned || raw.replace(/<[^>]+>/g, '').trim();
}

function parseTranscriptLine(line, isBacklog = false) {
  if (!line || !line.trim()) return;
  try {
    const entry = JSON.parse(line.trim());
    const stepIdx = entry.step_index || agentState.stepIndex;
    const source = entry.source || '';
    const stepType = entry.type || '';
    const status = entry.status || '';
    const toolCalls = entry.tool_calls || [];

    const entryTime = entry.created_at ? new Date(entry.created_at).getTime() : Date.now();
    agentState.stepIndex = stepIdx;
    agentState.timestamp = entryTime;

    if (source === 'USER_EXPLICIT' || stepType === 'USER_INPUT') {
      const userMsg = extractCleanUserMessage(entry.content || '');
      if (userMsg) {
        agentState.lastUserPrompt = userMsg;
        const last = agentState.chatHistory[agentState.chatHistory.length - 1];
        if (!last || last.text !== userMsg) {
          agentState.chatHistory.push({
            sender: 'user',
            text: userMsg,
            stepIndex: stepIdx
          });
          if (agentState.chatHistory.length > 50) agentState.chatHistory.shift();
        }
      }
      agentState.status = 'thinking';
      agentState.toolAction = userMsg ? `Procesando: "${userMsg.slice(0, 32)}..."` : 'Analizando tu petición...';
      agentState.checklist = { read: false, edit: false, bash: false, done: false };
      agentState.pendingApproval = null;
      if (!isBacklog && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('agent-update', agentState);
      }
      return;
    }

    if (status === 'ERROR') {
      agentState.status = 'error';
      agentState.toolAction = entry.content || 'Error en el paso';
      agentState.diffLines = [
        { type: 'del', text: `✕ Error: ${(entry.content || 'Fallo detectado').slice(0, 80)}` }
      ];
      if (!isBacklog && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('agent-update', agentState);
      }
      return;
    }

    if (status === 'CANCELLED' || status === 'ABORTED' || status === 'INTERRUPTED' || stepType === 'CANCELLED' ||
        (typeof entry.content === 'string' && (entry.content.includes('Execution was cancelled') || entry.content.includes('Turn cancelled by user')))) {
      agentState.status = 'cancelled';
      agentState.toolAction = 'Generación detenida por el usuario';
      agentState.diffLines = [
        { type: 'info', text: '⏹ Generación detenida para editar el mensaje' }
      ];
      if (!isBacklog && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('agent-update', agentState);
      }
      return;
    }

    if (source === 'MODEL' && stepType === 'PLANNER_RESPONSE') {
      if (toolCalls && toolCalls.length > 0) {
        const tool = toolCalls[0];
        const name = tool.name || '';
        const args = tool.args || {};
        const action = tool.toolAction || tool.toolSummary || name;

        agentState.toolAction = action;

        if (name === 'ask_question') {
          agentState.status = 'waiting';
          agentState.toolAction = 'Esperando tu aprobación...';

          let qText = 'Antigravity requiere tu confirmación para continuar';
          let qOptions = [
            'Permitir y continuar',
            'Permitir siempre en esta sesión',
            'Modificar parámetros',
            'Denegar / Cancelar'
          ];

          if (args.questions && args.questions.length > 0) {
            const q = args.questions[0];
            if (q.question) qText = q.question;
            if (q.options && q.options.length > 0) {
              qOptions = q.options;
            }
          }

          agentState.pendingApproval = {
            title: 'Solicitud de Permisos',
            question: qText,
            options: qOptions
          };
        } else if (name === 'invoke_subagent') {
          agentState.status = 'working';
          agentState.toolAction = 'Invocando subagentes...';
          if (args.Subagents && Array.isArray(args.Subagents)) {
            agentState.subagents = args.Subagents.map((s, idx) => ({
              id: `sub-${idx}`,
              role: s.Role || s.TypeName || 'Subagente',
              type: s.TypeName || 'subagent',
              status: 'running'
            }));
          }
        } else if (name === 'manage_subagents') {
          if (args.Action === 'kill' || args.Action === 'kill_all') {
            agentState.subagents = [];
          }
        } else {
          agentState.pendingApproval = null;
          if (name === 'view_file' || name === 'read_url_content' || name === 'search_web') {
            agentState.status = 'read';
            agentState.checklist.read = true;
            if (args.AbsolutePath) {
              const fileName = path.basename(args.AbsolutePath).replace(/['"]+/g, '').trim();
              agentState.activeFile = fileName || 'archivo';
              agentState.fileLang = fileName.split('.').pop() || 'ts';
            }
            agentState.diffLines = [
              { type: 'info', text: `Leyendo: ${agentState.activeFile}` }
            ];
          } else if (name === 'replace_file_content' || name === 'write_to_file') {
            agentState.status = 'edit';
            agentState.checklist.edit = true;
            const targetFile = args.TargetFile || '';
            if (targetFile) {
              const fileName = path.basename(targetFile).replace(/['"]+/g, '').trim();
              agentState.activeFile = fileName || 'código';
              agentState.fileLang = fileName.split('.').pop() || 'ts';
            }
            
            const diffs = [];
            if (args.TargetContent) {
              const oldLines = args.TargetContent.split('\n').slice(0, 3);
              oldLines.forEach(l => diffs.push({ type: 'del', text: `-  ${l}` }));
            }
            if (args.ReplacementContent) {
              const newLines = args.ReplacementContent.split('\n').slice(0, 3);
              newLines.forEach(l => diffs.push({ type: 'add', text: `+  ${newLines[0] || action}` }));
            }
            agentState.diffLines = diffs.length > 0 ? diffs : [
              { type: 'add', text: `+  ${action}` }
            ];
          } else if (name === 'run_command') {
            agentState.status = 'bash';
            agentState.checklist.bash = true;
            const cmd = args.CommandLine || action;
            agentState.activeFile = 'terminal.sh';
            agentState.fileLang = 'sh';
            agentState.diffLines = [
              { type: 'cmd', text: `$ ${cmd.replace(/\\"/g, '"')}` }
            ];
          }
        }
      } else {
        agentState.pendingApproval = null;

        // Si el modelo escribió una respuesta en entry.content
        if (entry.content && typeof entry.content === 'string' && entry.content.trim()) {
          const resp = entry.content.trim();
          agentState.responseContent = resp;
          const last = agentState.chatHistory[agentState.chatHistory.length - 1];
          if (!last || last.text !== resp) {
            agentState.chatHistory.push({
              sender: 'agent',
              text: resp,
              stepIndex: stepIdx
            });
            if (agentState.chatHistory.length > 50) agentState.chatHistory.shift();
          }
        }

        if (status === 'DONE') {
          agentState.status = 'done';
          agentState.checklist.done = true;
          agentState.toolAction = 'Turno completado con éxito';
          if (!isBacklog) {
            agentState.completedAt = Date.now();
          }
          if (!agentState.diffLines || agentState.diffLines.length === 0 || agentState.diffLines[0].type === 'done' || agentState.diffLines[0].type === 'info') {
            agentState.activeFile = 'Respuesta de Antigravity';
            agentState.fileLang = 'md';
            agentState.diffLines = [
              { type: 'done', text: '✓ Respuesta disponible' }
            ];
          }
        } else {
          agentState.status = 'thinking';
          agentState.toolAction = 'Razonando solución...';
        }
      }
    }

    if (!isBacklog && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('agent-update', agentState);
    }
  } catch (e) {
    console.error('Error parsing transcript line:', e);
  }
}

let brainWatcher = null;
let lastActiveSessionsJson = '';

function checkActiveSessionUpdates() {
  try {
    const sessions = getRecentSessions();
    if (!sessions || sessions.length === 0) return;

    agentState.activeSessions = sessions.map(s => ({
      id: s.id,
      shortId: s.shortId,
      title: s.title,
      mtime: s.mtime,
      status: s.status
    }));

    const activeWorkingSessions = agentState.activeSessions.filter(
      s => s.status === 'thinking' || s.status === 'working' || s.status === 'waiting'
    );
    agentState.activeWorkingCount = activeWorkingSessions.length;

    const currentSessionsJson = JSON.stringify(agentState.activeSessions);
    const sessionsChanged = currentSessionsJson !== lastActiveSessionsJson;
    if (sessionsChanged) {
      lastActiveSessionsJson = currentSessionsJson;
    }

    const latest = resolveActiveTranscript(sessions);
    if (!latest || !fs.existsSync(latest)) return;

    const stats = fs.statSync(latest);

    if (latest !== lastTranscriptPath) {
      lastTranscriptPath = latest;
      const convId = path.basename(path.dirname(path.dirname(path.dirname(latest))));
      activeSessionFullId = convId;
      agentState.sessionId = convId.substring(0, 8);
      agentState.sessionName = getConversationTitle(convId, latest) || `Sesión ${convId.substring(0, 8)}`;
      lastFileSize = stats.size;
      lastFileMtime = stats.mtimeMs;

      const content = fs.readFileSync(latest, 'utf8');
      const lines = content.trim().split('\n');
      if (lines.length > 0) {
        // Recrear historial con las últimas 150 líneas en modo backlog
        const recent = lines.slice(-150);
        recent.forEach(l => parseTranscriptLine(l, true));
      }

      const isFresh = (Date.now() - stats.mtimeMs) < 15000;
      if ((agentState.status === 'thinking' || agentState.status === 'done') && !isFresh) {
        agentState.status = 'idle';
        agentState.toolAction = 'Listo para programar';
        agentState.completedAt = 0;
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('agent-update', agentState);
      }
      return;
    }

    // Si las sesiones cambiaron (ej. un chat secundario empezó a pensar/trabajar), actualizar frontend de inmediato
    if (sessionsChanged && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('agent-update', agentState);
    }

    // Mismo archivo: si ni tamaño ni fecha cambiaron:
    if (stats.size === lastFileSize && stats.mtimeMs === lastFileMtime) {
      if (agentState.status === 'thinking' && (Date.now() - lastFileMtime) > 25000) {
        agentState.status = 'idle';
        agentState.toolAction = 'Listo para programar';
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('agent-update', agentState);
        }
      }
      return;
    }

    lastFileMtime = stats.mtimeMs;

    if (stats.size > lastFileSize) {
      const stream = fs.createReadStream(latest, {
        start: lastFileSize,
        end: stats.size
      });
      lastFileSize = stats.size;
      let buffer = '';
      stream.on('data', chunk => buffer += chunk.toString('utf8'));
      stream.on('end', () => {
        if (!buffer.trim()) return;
        const lines = buffer.trim().split('\n');
        lines.forEach(l => parseTranscriptLine(l, false));
      });
    } else if (stats.size < lastFileSize) {
      // Detección instantánea de "Undo to this point" en Antigravity
      lastFileSize = stats.size;
      agentState.chatHistory = [];
      agentState.diffLines = [
        { type: 'info', text: '↺ Conversación revertida a un punto anterior' }
      ];
      agentState.status = 'idle';
      agentState.toolAction = 'Revertido a un paso anterior';

      const content = fs.readFileSync(latest, 'utf8');
      const lines = content.trim().split('\n');
      if (lines.length > 0) {
        const recent = lines.slice(-150);
        recent.forEach(l => parseTranscriptLine(l, true));
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('agent-update', agentState);
      }
    }
  } catch (err) {
    console.error('Error in checkActiveSessionUpdates:', err);
  }
}

function startTranscriptWatcher() {
  syncSessionTitlesFromDb();

  // 1. Chequeo inicial
  checkActiveSessionUpdates();

  // 2. fs.watch instantáneo (0ms) en todo el directorio de sesiones de Antigravity
  const brainDir = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
  if (fs.existsSync(brainDir)) {
    try {
      brainWatcher = fs.watch(brainDir, { recursive: true }, (eventType, filename) => {
        if (filename && filename.includes('transcript.jsonl')) {
          checkActiveSessionUpdates();
        }
      });
    } catch (e) {
      console.error('Error starting fs.watch on brain directory:', e);
    }
  }

  // 3. Heartbeat cada 500ms como respaldo continuo y para sincronizar títulos de la BD
  let tick = 0;
  watcherInterval = setInterval(() => {
    checkActiveSessionUpdates();
    tick++;
    if (tick % 6 === 0) {
      syncSessionTitlesFromDb();
    }
  }, 500);
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, 'tray-icon.png');
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Antigravity Notch',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Mostrar / Ocultar Notch',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isVisible()) {
              mainWindow.hide();
            } else {
              mainWindow.show();
            }
          }
        }
      },
      {
        label: 'Centrar en pantalla',
        click: () => {
          if (mainWindow) {
            const primaryDisplay = screen.getPrimaryDisplay();
            const { width: screenWidth } = primaryDisplay.workAreaSize;
            mainWindow.setPosition(Math.round((screenWidth - 560) / 2), 0);
            mainWindow.show();
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Salir de Antigravity Notch',
        click: () => {
          app.quit();
        }
      }
    ]);

    tray.setToolTip('Antigravity Notch');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
        }
      }
    });
  } catch (e) {
    console.error('Error creating tray:', e);
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const windowWidth = 570;
  const windowHeight = 330;
  const posX = Math.round((screenWidth - windowWidth) / 2);

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: posX,
    y: 0,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Evitar que Win + D (Mostrar escritorio) oculte la muesca
  mainWindow.on('minimize', (e) => {
    e.preventDefault();
    mainWindow.restore();
  });

  // Re-asegurar que se mantenga al frente cuando otras ventanas ganan foco
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.webContents.send('window-blur');
    }
  });

  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  const isDev = !app.isPackaged && process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html')).catch(() => {
      mainWindow.loadURL('http://localhost:5173');
    });
  }

  // Seguimiento global eficiente del cursor (con umbral y 65ms para evitar lag en el mouse)
  let lastCursorX = -9999;
  let lastCursorY = -9999;
  cursorInterval = setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
      const cursor = screen.getCursorScreenPoint();
      if (Math.abs(cursor.x - lastCursorX) < 4 && Math.abs(cursor.y - lastCursorY) < 4) {
        return; // Mouse en reposo: 0 IPC enviados, 0 consumo de CPU
      }
      lastCursorX = cursor.x;
      lastCursorY = cursor.y;

      const notchCenterX = posX + windowWidth / 2;
      const notchCenterY = 24;

      const nx = (cursor.x - notchCenterX) / (screenWidth / 2);
      const ny = (cursor.y - notchCenterY) / (screenHeight / 1.6);

      mainWindow.webContents.send('global-cursor', {
        nx: Math.max(-1, Math.min(1, nx)),
        ny: Math.max(-0.8, Math.min(1, ny))
      });
    } catch (e) {}
  }, 65);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (watcherInterval) clearInterval(watcherInterval);
    if (cursorInterval) clearInterval(cursorInterval);
    if (brainWatcher) {
      try { brainWatcher.close(); } catch (e) {}
    }
    if (antigravityWatchdogInterval) clearInterval(antigravityWatchdogInterval);
  });

  screen.on('display-metrics-changed', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const primary = screen.getPrimaryDisplay();
      const newPosX = Math.round((primary.workAreaSize.width - windowWidth) / 2);
      mainWindow.setPosition(newPosX, 0);
    }
  });

  createTray();
  startTranscriptWatcher();
  startAntigravityWatchdog();
}

let antigravityWatchdogInterval = null;
const appStartTime = Date.now();

function startAntigravityWatchdog() {
  antigravityWatchdogInterval = setInterval(() => {
    // 20s de gracia al inicio para permitir que Antigravity arranque
    if (Date.now() - appStartTime < 20000) return;

    exec('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH', { windowsHide: true }, (err, stdout) => {
      if (err) return;
      const isRunning = typeof stdout === 'string' && stdout.includes('Antigravity.exe');
      if (!isRunning) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.close();
        }
        app.quit();
      }
    });
  }, 4000);
}

ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

ipcMain.on('switch-session', (event, sessionId) => {
  manualSelectedSessionId = sessionId;
  manualSelectedTime = Date.now();
  lastTranscriptPath = null;
  lastFileSize = 0;
  lastFileMtime = 0;
  checkActiveSessionUpdates();
});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('minimize-app', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }
});

ipcMain.on('clear-done-status', () => {
  if (agentState.status === 'done' || agentState.status === 'thinking') {
    agentState.status = 'idle';
    agentState.toolAction = 'Listo para programar';
    agentState.completedAt = 0;
  }
});

ipcMain.handle('get-agent-state', () => {
  return agentState;
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
