import React, { useEffect } from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';

interface ApprovalCardProps {
  title?: string;
  question?: string;
  options?: string[];
  stepIndex?: number;
  onSelect: (index: number, option: string) => void;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  title = 'Solicitud de Aprobación',
  question = '¿Deseas permitir la ejecución de esta acción?',
  options = [
    'Permitir y continuar',
    'Permitir siempre en esta sesión',
    'Modificar parámetros',
    'Denegar / Cancelar'
  ],
  stepIndex = 0,
  onSelect
}) => {
  // Atajos de teclado 1, 2, 3, 4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= options.length) {
        onSelect(num - 1, options[num - 1]);
      } else if (e.key === 'Escape') {
        // La última opción siempre es Denegar / Cancelar
        onSelect(options.length - 1, options[options.length - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, onSelect]);

  return (
    <div className="flex-1 h-[185px] bg-zinc-950/90 border border-amber-500/30 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
      {/* Cabecera de Alerta */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10 bg-amber-500/10 text-xs">
        <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
          <ShieldAlert size={14} className="animate-pulse" />
          <span>{title}</span>
        </div>
        <span className="text-zinc-500 font-mono text-[10px]">
          #{stepIndex}
        </span>
      </div>

      {/* Pregunta / Detalle */}
      <div className="px-3 py-2 flex flex-col justify-between flex-1">
        <p className="text-xs text-zinc-200 font-medium line-clamp-2 leading-snug">
          {question}
        </p>

        {/* Las 4 opciones interactivas */}
        <div className="flex flex-col gap-1 mt-2">
          {options.slice(0, 4).map((opt, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === options.length - 1 || idx === 3;

            return (
              <button
                key={idx}
                onClick={() => onSelect(idx, opt)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[11px] font-medium transition-all group ${
                  isFirst
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : isLast
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25'
                    : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isFirst ? 'bg-emerald-500 text-black' : isLast ? 'bg-red-500/40 text-white' : 'bg-white/10 text-zinc-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="truncate">{opt}</span>
                </div>

                {isFirst ? (
                  <Check size={12} className="text-emerald-400 flex-shrink-0" />
                ) : isLast ? (
                  <X size={12} className="text-red-400 flex-shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
