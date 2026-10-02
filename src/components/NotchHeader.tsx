import React from 'react';
import { Home, Settings, Volume2, VolumeX, X } from 'lucide-react';

interface NotchHeaderProps {
  currentTab: 'home' | 'settings';
  onTabChange: (tab: 'home' | 'settings') => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onCollapse: () => void;
  onQuit?: () => void;
}

export const NotchHeader: React.FC<NotchHeaderProps> = ({
  currentTab,
  onTabChange,
  soundEnabled,
  onToggleSound,
  onCollapse,
  onQuit
}) => {
  return (
    <div className="w-full flex items-center justify-between px-3.5 py-1.5 border-b border-white/5 bg-zinc-950/40">
      {/* Navegación Izquierda: Vista Principal */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onTabChange('home')}
          className={`p-1.5 rounded-full transition-all ${
            currentTab === 'home'
              ? 'bg-white/15 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
          title="Panel de Actividad de Antigravity"
        >
          <Home size={14} strokeWidth={2.2} />
        </button>
        <span className="text-[11px] font-semibold text-zinc-300 font-sans tracking-tight">
          Antigravity Companion
        </span>
      </div>

      {/* Acciones Derecha */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onTabChange('settings')}
          className={`p-1.5 rounded-full transition-all ${
            currentTab === 'settings'
              ? 'bg-white/15 text-white'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
          title="Configuración"
        >
          <Settings size={14} strokeWidth={2.2} />
        </button>

        <button
          onClick={onToggleSound}
          className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-all"
          title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
        >
          {soundEnabled ? (
            <Volume2 size={14} strokeWidth={2.2} />
          ) : (
            <VolumeX size={14} strokeWidth={2.2} className="text-zinc-500" />
          )}
        </button>

        {/* Botón para minimizar / cerrar la vista expandida (Esc) */}
        <button
          onClick={onCollapse}
          className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all ml-1"
          title="Minimizar muesca (Esc)"
        >
          <X size={14} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
};
