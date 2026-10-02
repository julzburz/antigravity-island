import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, LogOut, Check, Volume2, VolumeX, Eye } from 'lucide-react';
import { NotchHeader } from './components/NotchHeader';
import { CircularPet } from './components/CircularPet';
import { ActionChecklist } from './components/ActionChecklist';
import { CodePreviewCard } from './components/CodePreviewCard';
import { ApprovalCard } from './components/ApprovalCard';
import { SubagentPills } from './components/SubagentPills';

interface Subagent {
  id: string;
  role: string;
  type: string;
  status: string;
}

interface ActiveSession {
  id: string;
  shortId: string;
  title?: string;
  mtime: number;
  status?: string;
}

interface ChatMessage {
  sender: 'user' | 'agent';
  text: string;
  stepIndex?: number;
}

interface AgentState {
  status: 'idle' | 'thinking' | 'read' | 'edit' | 'bash' | 'done' | 'waiting' | 'error' | 'dizzy' | 'working' | 'cancelled';
  title: string;
  sessionName: string;
  sessionId?: string;
  stepIndex: number;
  activeFile: string;
  fileLang: string;
  toolAction: string;
  responseContent?: string;
  lastUserPrompt?: string;
  chatHistory?: ChatMessage[];
  diffLines: Array<{ type: 'del' | 'add' | 'info' | 'cmd' | 'done'; text: string }>;
  checklist: {
    read: boolean;
    edit: boolean;
    bash: boolean;
    done: boolean;
  };
  pendingApproval?: {
    title: string;
    question: string;
    options: string[];
  } | null;
  subagents?: Subagent[];
  activeSessions?: ActiveSession[];
  activeWorkingCount?: number;
}

export const App: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [currentTab, setCurrentTab] = useState<'home' | 'settings'>('home');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDizzy, setIsDizzy] = useState(false);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [agent, setAgent] = useState<AgentState>({
    status: 'idle',
    title: 'Antigravity 2.0',
    sessionName: 'Cargando sesión...',
    sessionId: '',
    stepIndex: 0,
    activeFile: 'workspace',
    fileLang: 'ts',
    toolAction: 'Listo para programar',
    responseContent: '',
    lastUserPrompt: '',
    chatHistory: [],
    diffLines: [
      { type: 'info', text: 'Esperando sesión activa...' }
    ],
    checklist: {
      read: false,
      edit: false,
      bash: false,
      done: false
    },
    pendingApproval: null,
    subagents: [],
    activeSessions: [],
    activeWorkingCount: 0
  });

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.12, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } catch (e) {}
  };

  useEffect(() => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.getAgentState().then((state: AgentState) => {
        if (state) setAgent(state);
      });

      (window as any).electronAPI.onAgentUpdate((newState: AgentState) => {
        setAgent(prev => {
          if (newState.status === 'done' && prev.status !== 'done') {
            playChime();
          }
          return newState;
        });
      });
      (window as any).electronAPI.onWindowBlur?.(() => {
        collapseNotch();
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        collapseNotch();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
        if ((window as any).electronAPI?.quitApp) {
          (window as any).electronAPI.quitApp();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [soundEnabled]);

  const isExpandedRef = useRef(isExpanded);
  const agentRef = useRef(agent);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  useEffect(() => {
    agentRef.current = agent;
  }, [agent]);

  const collapseNotch = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    // Si el usuario abrió la muesca y ahora la cierra, el estado "Listo" o si quedó detenido en "Pensando" se borra y pasa a descanso
    if (isExpandedRef.current && (agentRef.current.status === 'done' || agentRef.current.status === 'thinking')) {
      setAgent(prev => ({
        ...prev,
        status: 'idle',
        toolAction: 'Listo para programar'
      }));
      if ((window as any).electronAPI?.clearDoneStatus) {
        (window as any).electronAPI.clearDoneStatus();
      }
    }

    setIsExpanded(false);
    setIsPinned(false);
    if ((window as any).electronAPI) {
      (window as any).electronAPI.setIgnoreMouseEvents(true);
    }
  };

  const handleNotchMouseEnter = () => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    if ((window as any).electronAPI) {
      (window as any).electronAPI.setIgnoreMouseEvents(false);
    }
  };

  const handleNotchMouseLeave = () => {
    if (isPinned) return;
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = setTimeout(() => {
      collapseNotch();
    }, 2000);
  };

  const handleCompactClick = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      setIsPinned(true);
      if ((window as any).electronAPI) {
        (window as any).electronAPI.setIgnoreMouseEvents(false);
      }
    }
  };

  const handleSelectOption = (index: number, option: string) => {
    setAgent(prev => ({
      ...prev,
      status: 'working',
      toolAction: `Aprobado: ${option}`,
      pendingApproval: null
    }));
    playChime();
  };

  const handleSwitchSession = (sessionId: string) => {
    if ((window as any).electronAPI && (window as any).electronAPI.switchSession) {
      (window as any).electronAPI.switchSession(sessionId);
    }
  };

  const handleQuit = () => {
    if ((window as any).electronAPI?.quitApp) {
      (window as any).electronAPI.quitApp();
    }
  };

  const waitingSession = agent.activeSessions?.find(s => s.status === 'waiting');
  const isEmergency = agent.status === 'waiting' || !!waitingSession;
  const subagentCount = agent.subagents ? agent.subagents.length : 0;
  const workingChatsCount = agent.activeWorkingCount || 0;

  const getCompactStatusInfo = () => {
    if (isEmergency) {
      const waitTitle = waitingSession && waitingSession.id !== agent.sessionId
        ? (waitingSession.title ? waitingSession.title.slice(0, 14) : 'Chat')
        : null;
      return {
        text: waitTitle ? `Permiso: ${waitTitle}` : 'Permiso requerido',
        textColor: 'text-amber-400 font-bold',
        dotColor: 'bg-amber-400 animate-ping',
        width: 220,
      };
    }
    if (workingChatsCount > 1) {
      return {
        text: `⚡ ${workingChatsCount} chats activos`,
        textColor: 'text-sky-300 font-bold',
        dotColor: 'bg-sky-400 animate-pulse',
        width: 215,
      };
    }
    if (workingChatsCount === 1 && agent.status === 'idle') {
      const activeBgSession = agent.activeSessions?.find(
        s => s.status === 'thinking' || s.status === 'working' || s.status === 'waiting'
      );
      if (activeBgSession) {
        const bgStatus = activeBgSession.status === 'thinking' ? 'Pensando...' : 'Trabajando...';
        return {
          text: `${bgStatus} (${activeBgSession.shortId})`,
          textColor: 'text-sky-300 font-semibold',
          dotColor: 'bg-sky-400 animate-pulse',
          width: 215,
        };
      }
    }
    if (subagentCount > 0) {
      return {
        text: `Antigravity • ${subagentCount} sub`,
        textColor: 'text-cyan-300 font-semibold',
        dotColor: 'bg-cyan-400 animate-pulse',
        width: 220,
      };
    }
    switch (agent.status) {
      case 'thinking':
        return {
          text: 'Pensando...',
          textColor: 'text-purple-300 font-semibold',
          dotColor: 'bg-purple-400 animate-pulse',
          width: 195,
        };
      case 'edit':
        return {
          text: 'Escribiendo...',
          textColor: 'text-cyan-300 font-semibold',
          dotColor: 'bg-cyan-400 animate-pulse',
          width: 200,
        };
      case 'read':
        return {
          text: 'Leyendo...',
          textColor: 'text-blue-300 font-semibold',
          dotColor: 'bg-blue-400 animate-pulse',
          width: 190,
        };
      case 'bash':
        return {
          text: 'Ejecutando...',
          textColor: 'text-amber-300 font-semibold',
          dotColor: 'bg-amber-400 animate-pulse',
          width: 200,
        };
      case 'working':
        return {
          text: 'Trabajando...',
          textColor: 'text-sky-300 font-semibold',
          dotColor: 'bg-sky-400 animate-pulse',
          width: 195,
        };
      case 'done':
        return {
          text: 'Listo ✓',
          textColor: 'text-emerald-400 font-semibold',
          dotColor: 'bg-emerald-400',
          width: 180,
        };
      case 'error':
        return {
          text: 'Error ✕',
          textColor: 'text-red-400 font-semibold',
          dotColor: 'bg-red-500 animate-pulse',
          width: 180,
        };
      case 'cancelled':
        return {
          text: 'Detenido ⏹',
          textColor: 'text-amber-300 font-semibold',
          dotColor: 'bg-amber-400',
          width: 190,
        };
      case 'idle':
      default:
        return {
          text: 'Antigravity',
          textColor: 'text-zinc-300 font-semibold',
          dotColor: 'bg-zinc-600',
          width: 185,
        };
    }
  };

  const statusInfo = getCompactStatusInfo();
  const effectiveStatus = (agent.activeWorkingCount || 0) > 0 && agent.status === 'idle'
    ? 'working'
    : agent.status;
  const hasBottomPills = (agent.subagents && agent.subagents.length > 0) || (agent.activeSessions && agent.activeSessions.length > 1);
  const expandedHeight = hasBottomPills ? 320 : 270;

  return (
    <div
      className="w-full h-full flex justify-center items-start pt-0 select-none"
      onClick={collapseNotch}
    >
      <motion.div
        onMouseEnter={handleNotchMouseEnter}
        onMouseLeave={handleNotchMouseLeave}
        onClick={(e) => {
          e.stopPropagation();
          if (!isExpanded) {
            handleCompactClick();
          } else {
            setIsPinned(true);
          }
        }}
        layout
        initial={false}
        animate={{
          width: isExpanded ? 550 : statusInfo.width,
          height: isExpanded ? expandedHeight : 34,
          borderRadius: isExpanded ? '0 0 26px 26px' : '0 0 18px 18px',
        }}
        transition={{
          type: 'spring',
          stiffness: 440,
          damping: 32,
          mass: 0.8
        }}
        className={`bg-zinc-950 text-white overflow-hidden relative flex flex-col shadow-2xl transition-all cursor-pointer border-b border-x border-white/15 ${
          isEmergency && !isExpanded
            ? 'border-b border-x border-amber-500/80 ring-1 ring-amber-500/50'
            : ''
        }`}
      >
        {/* Vista Colapsada (Muesca compacta de 34px) */}
        {!isExpanded && (
          <div className="w-full h-full flex items-center justify-between px-3">
            {/* Avatar agrandado con presencia nítida */}
            <div className="flex items-center gap-2.5 min-w-0">
              <CircularPet status={effectiveStatus} size={26} />
              <span className={`text-[11px] font-sans tracking-tight truncate ${statusInfo.textColor}`}>
                {statusInfo.text}
              </span>
            </div>

            {/* Punto indicador de estado */}
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`} />
            </div>
          </div>
        )}

        {/* Vista Expandida (Dashboard Apple Notch completo) */}
        {isExpanded && (
          <div className="w-full h-full flex flex-col cursor-default" onClick={e => e.stopPropagation()}>
            {/* Barra superior de navegación */}
            <NotchHeader
              currentTab={currentTab}
              onTabChange={setCurrentTab}
              soundEnabled={soundEnabled}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              onCollapse={collapseNotch}
              onQuit={handleQuit}
            />

            {/* Contenido según pestaña */}
            <div className="px-4 pt-1.5 pb-2 flex-1 flex items-start">
              {isDizzy ? (
                /* Pantalla de Mareo */
                <div className="w-full flex items-center gap-4 bg-zinc-950/80 border border-white/10 rounded-2xl p-4">
                  <CircularPet status="dizzy" size={80} />
                  <div>
                    <h3 className="text-white font-semibold text-sm">
                      Demasiados toques seguidos.
                    </h3>
                    <p className="text-zinc-400 text-xs mt-0.5">
                      Dame un respiro — de vuelta al trabajo en 3 segundos.
                    </p>
                  </div>
                </div>
              ) : currentTab === 'home' ? (
                /* Vista Principal: Columna izquierda + Tarjeta derecha */
                <div className="w-full flex items-start gap-3.5">
                  {/* Columna Izquierda: Mascota Circular Protagonista (68px) + Checklist */}
                  <div className="w-[130px] flex flex-col items-center gap-1.5 flex-shrink-0">
                    <CircularPet
                      status={agent.status}
                      size={68}
                      onDizzyChange={setIsDizzy}
                    />
                    <ActionChecklist
                      sessionName={agent.sessionName}
                      sessionId={agent.sessionId}
                      agentName={agent.title}
                      status={agent.status}
                      checklist={agent.checklist}
                    />
                  </div>

                  {/* Columna Derecha: Tarjeta de Aprobación O Vista de Código/Respuesta */}
                  {isEmergency && agent.pendingApproval ? (
                    <ApprovalCard
                      title={agent.pendingApproval.title}
                      question={agent.pendingApproval.question}
                      options={agent.pendingApproval.options}
                      stepIndex={agent.stepIndex}
                      onSelect={handleSelectOption}
                    />
                  ) : (
                    <CodePreviewCard
                      activeFile={agent.activeFile}
                      fileLang={agent.fileLang}
                      diffLines={agent.diffLines}
                      toolAction={agent.toolAction}
                      stepIndex={agent.stepIndex}
                      responseContent={agent.responseContent}
                    />
                  )}
                </div>
              ) : (
                /* Pestaña de Configuración y Control */
                <div className="w-full flex flex-col gap-2 px-3 text-xs text-zinc-300">
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="flex items-center gap-1.5">
                      <Eye size={13} className="text-zinc-400" />
                      <span>Mascota Circular (Motor Bloub)</span>
                    </span>
                    <span className="text-emerald-400 font-semibold text-[11px]">Activa</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span>Efectos de Sonido</span>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                    >
                      {soundEnabled ? (
                        <span className="text-emerald-400 flex items-center gap-1"><Volume2 size={12} /> Habilitados</span>
                      ) : (
                        <span className="text-zinc-500 flex items-center gap-1"><VolumeX size={12} /> Silenciados</span>
                      )}
                    </button>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span>Minimizar notch</span>
                    <span className="text-zinc-400 font-mono text-[11px]">Esc</span>
                  </div>

                  {/* Botón para Cerrar Aplicación */}
                  <button
                    onClick={handleQuit}
                    className="w-full mt-2 py-1.5 px-3 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <LogOut size={13} />
                      <span>Salir de Antigravity Notch</span>
                    </span>
                    <span className="text-[10px] text-red-400/70 font-mono">Ctrl + Q</span>
                  </button>
                </div>
              )}
            </div>

            {/* Píldoras de Subagentes y Selector de Sesiones en la parte inferior */}
            <SubagentPills
              subagents={agent.subagents || []}
              activeSessions={agent.activeSessions || []}
              currentSessionId={agent.sessionId || ''}
              onSelectSession={handleSwitchSession}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};
export default App;
