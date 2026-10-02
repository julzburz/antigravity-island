import React from 'react';
import { Check, Terminal } from 'lucide-react';

interface ActionChecklistProps {
  sessionName: string;
  sessionId?: string;
  agentName: string;
  status: string;
  checklist: {
    read: boolean;
    edit: boolean;
    bash: boolean;
    done: boolean;
  };
}

export const ActionChecklist: React.FC<ActionChecklistProps> = ({
  sessionName,
  sessionId,
  agentName,
  status,
  checklist
}) => {
  return (
    <div className="flex flex-col gap-1 text-xs select-none w-full">
      {/* Título del chat y agente */}
      <div className="w-full text-center px-0.5">
        <div
          className="font-bold text-white tracking-tight text-[11px] leading-snug line-clamp-2"
          title={sessionName}
        >
          {sessionName}
        </div>
        <div className="text-[9px] text-zinc-400 font-mono flex items-center justify-center gap-1 mt-0.5 truncate">
          <span>{agentName}</span>
          {sessionId && <span className="text-sky-400 font-semibold">#{sessionId}</span>}
        </div>
      </div>

      {/* Lista vertical de acciones compacta */}
      <div className="flex flex-col gap-0.5 mt-0.5 font-medium text-[10px]">
        {/* Read */}
        <div className={`flex items-center gap-1.5 py-0.5 transition-colors ${
          status === 'read' ? 'text-cyan-400 font-semibold' : checklist.read ? 'text-zinc-300' : 'text-zinc-500'
        }`}>
          {checklist.read ? (
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check size={9} strokeWidth={3} />
            </div>
          ) : (
            <div className={`w-3 h-3 rounded-full border ${status === 'read' ? 'border-cyan-400 bg-cyan-400/20 animate-pulse' : 'border-zinc-600'} flex items-center justify-center`} />
          )}
          <span>Leer</span>
        </div>

        {/* Edit */}
        <div className={`flex items-center gap-1.5 py-0.5 transition-colors ${
          status === 'edit' ? 'text-cyan-400 font-semibold' : checklist.edit ? 'text-zinc-300' : 'text-zinc-500'
        }`}>
          {checklist.edit ? (
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check size={9} strokeWidth={3} />
            </div>
          ) : (
            <div className={`w-3 h-3 rounded-full border ${status === 'edit' ? 'border-cyan-400 bg-cyan-400/20 animate-pulse' : 'border-zinc-600'} flex items-center justify-center`} />
          )}
          <span>Editar</span>
        </div>

        {/* Bash / Terminal */}
        <div className={`flex items-center gap-1.5 py-0.5 transition-colors ${
          status === 'bash' ? 'text-cyan-400 font-semibold' : checklist.bash ? 'text-zinc-300' : 'text-zinc-500'
        }`}>
          {checklist.bash ? (
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check size={9} strokeWidth={3} />
            </div>
          ) : (
            <div className={`w-3 h-3 rounded-full border ${status === 'bash' ? 'border-cyan-400 bg-cyan-400/20 animate-pulse' : 'border-zinc-600'} flex items-center justify-center`}>
              <Terminal size={7} />
            </div>
          )}
          <span>Terminal</span>
        </div>

        {/* Done / Error / Cancelled */}
        <div className={`flex items-center gap-1.5 py-0.5 transition-colors ${
          status === 'done' ? 'text-emerald-400 font-semibold' :
          status === 'error' ? 'text-red-400 font-semibold' :
          status === 'cancelled' ? 'text-amber-400 font-semibold' :
          checklist.done ? 'text-zinc-300' : 'text-zinc-500'
        }`}>
          {status === 'error' ? (
            <div className="w-3 h-3 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-[8px]">
              ✕
            </div>
          ) : status === 'cancelled' ? (
            <div className="w-3 h-3 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[7px]">
              ⏹
            </div>
          ) : checklist.done || status === 'done' ? (
            <div className="w-3 h-3 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check size={9} strokeWidth={3} />
            </div>
          ) : (
            <div className="w-3 h-3 rounded-full border border-zinc-600 flex items-center justify-center" />
          )}
          <span>
            {status === 'error' ? 'Error' :
             status === 'cancelled' ? 'Detenido' :
             'Listo'}
          </span>
        </div>
      </div>
    </div>
  );
};
