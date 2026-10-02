import React from 'react';
import { Bot, Layers } from 'lucide-react';

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

interface SubagentPillsProps {
  subagents: Subagent[];
  activeSessions: ActiveSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
}

const renderSessionDot = (status?: string, isActive?: boolean) => {
  switch (status) {
    case 'thinking':
      return (
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
        </span>
      );
    case 'working':
    case 'edit':
    case 'read':
    case 'bash':
      return (
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
        </span>
      );
    case 'waiting':
      return (
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-80" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
      );
    case 'done':
      return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />;
    case 'error':
      return <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />;
    default:
      return <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-sky-400' : 'bg-zinc-600'}`} />;
  }
};

const getSessionStatusLabel = (status?: string) => {
  switch (status) {
    case 'thinking': return 'Pensando...';
    case 'working':
    case 'edit':
    case 'read':
    case 'bash': return 'Trabajando...';
    case 'waiting': return 'Esperando permiso';
    case 'done': return 'Listo ✓';
    case 'error': return 'Error';
    default: return 'En espera';
  }
};

export const SubagentPills: React.FC<SubagentPillsProps> = ({
  subagents = [],
  activeSessions = [],
  currentSessionId,
  onSelectSession
}) => {
  if (subagents.length === 0 && activeSessions.length <= 1) {
    return null;
  }

  const getSubColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('research')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30 dot-bg-purple-400';
    if (t.includes('code') || t.includes('dev')) return 'bg-blue-500/20 text-blue-300 border-blue-500/30 dot-bg-blue-400';
    if (t.includes('bash') || t.includes('cmd')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30 dot-bg-amber-400';
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 dot-bg-emerald-400';
  };

  return (
    <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar px-3.5 pt-1.5 pb-2.5 border-t border-white/10 bg-zinc-950 text-[10px]">
      {/* Selector de Sesiones con estados en vivo */}
      {activeSessions.length > 1 && (
        <div className="flex items-center gap-1.5 flex-shrink-0 text-zinc-400">
          <Layers size={11} className="text-zinc-500 flex-shrink-0" />
          <span className="font-semibold text-zinc-400 mr-0.5">Sesiones:</span>
          {activeSessions.map((s) => {
            const isActive = s.shortId === currentSessionId || s.id === currentSessionId;
            const statusLabel = getSessionStatusLabel(s.status);
            const isWaiting = s.status === 'waiting';

            return (
              <button
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition-all truncate max-w-[140px] relative ${
                  isActive
                    ? 'bg-sky-500/25 text-sky-200 border-sky-400/50 font-bold shadow-sm'
                    : isWaiting
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 hover:bg-amber-500/30'
                    : 'bg-white/5 text-zinc-400 border-white/5 hover:text-zinc-200 hover:bg-white/10'
                }`}
                title={`${s.title || '#' + s.shortId} • ${statusLabel}`}
              >
                {renderSessionDot(s.status, isActive)}
                <span className="truncate">{s.title ? s.title.slice(0, 18) : `#${s.shortId}`}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Píldoras de Subagentes */}
      {subagents.length > 0 && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Bot size={11} className="text-zinc-500 flex-shrink-0" />
          {subagents.map((sub) => {
            const style = getSubColor(sub.type);
            return (
              <div
                key={sub.id}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${style} select-none flex-shrink-0`}
                title={`Subagente: ${sub.role}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                <span className="font-medium truncate max-w-[90px]">{sub.role}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
