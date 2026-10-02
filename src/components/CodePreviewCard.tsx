import React, { useState } from 'react';
import { Copy, Check, FileText, Code2, Sparkles } from 'lucide-react';

interface CodePreviewCardProps {
  activeFile: string;
  fileLang: string;
  diffLines?: { type: 'del' | 'add' | 'info' | 'cmd' | 'done'; text: string }[];
  toolAction?: string;
  stepIndex?: number;
  responseContent?: string;
}

export const CodePreviewCard: React.FC<CodePreviewCardProps> = ({
  activeFile,
  fileLang,
  diffLines = [],
  toolAction = '',
  stepIndex = 0,
  responseContent = ''
}) => {
  const hasActiveDiffs = diffLines.some(d => d.type === 'add' || d.type === 'del' || d.type === 'cmd');
  const [activeTab, setActiveTab] = useState<'code' | 'response'>(
    !hasActiveDiffs && responseContent ? 'response' : 'code'
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!responseContent) return;
    navigator.clipboard.writeText(responseContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLangBadge = (lang: string) => {
    const l = lang.toLowerCase();
    if (l === 'ts' || l === 'tsx') return { label: 'TS', bg: 'bg-blue-600/30 text-blue-400 border-blue-500/30' };
    if (l === 'js' || l === 'jsx') return { label: 'JS', bg: 'bg-yellow-600/30 text-yellow-400 border-yellow-500/30' };
    if (l === 'py') return { label: 'PY', bg: 'bg-emerald-600/30 text-emerald-400 border-emerald-500/30' };
    if (l === 'sh' || l === 'bat' || l === 'ps1') return { label: '$_', bg: 'bg-purple-600/30 text-purple-400 border-purple-500/30' };
    if (l === 'md') return { label: 'MD', bg: 'bg-amber-600/30 text-amber-400 border-amber-500/30' };
    return { label: l.toUpperCase().slice(0, 2), bg: 'bg-zinc-700/50 text-zinc-300 border-zinc-600/40' };
  };

  const badge = getLangBadge(fileLang);

  // Formateador simple de markdown para visualización rápida y elegante
  const formatMarkdownText = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    const elements: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // Cerrar bloque de código
          elements.push(
            <pre key={`code-${idx}`} className="bg-zinc-950/80 border border-white/10 rounded p-1.5 font-mono text-[10px] text-emerald-300 my-1 overflow-x-auto">
              <code>{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      const trimmed = line.trim();
      if (!trimmed) {
        elements.push(<div key={`empty-${idx}`} className="h-1.5" />);
        return;
      }

      // Encabezados
      if (trimmed.startsWith('#')) {
        const title = trimmed.replace(/^#+\s*/, '');
        elements.push(
          <p key={`h-${idx}`} className="font-semibold text-white text-[11px] mt-1 mb-0.5 flex items-center gap-1">
            <span className="w-1 h-3 bg-amber-400 rounded-full inline-block" />
            {title}
          </p>
        );
        return;
      }

      // Viñetas o listas
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed);
      const bulletText = isBullet ? trimmed.replace(/^([-*]|\d+\.)\s*/, '') : trimmed;

      // Inline code y negritas
      const parts = bulletText.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={pIdx} className="bg-white/10 text-cyan-300 px-1 py-0.5 rounded text-[10px] font-mono mx-0.5">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="text-white font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        elements.push(
          <div key={`bullet-${idx}`} className="flex items-start gap-1.5 pl-1.5 text-zinc-300 text-[11px] leading-relaxed">
            <span className="text-amber-400/80 select-none">•</span>
            <span>{formattedParts}</span>
          </div>
        );
      } else {
        elements.push(
          <p key={`p-${idx}`} className="text-zinc-300 text-[11px] leading-relaxed">
            {formattedParts}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="flex-1 h-[185px] bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm">
      {/* Cabecera de la tarjeta con selector de pestañas Código / Respuesta */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-zinc-900/50 text-[11px]">
        <div className="flex items-center gap-1.5">
          {/* Pestaña Código */}
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors text-[10px] font-medium ${
              activeTab === 'code'
                ? 'bg-white/15 text-white font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 size={12} />
            <span>{activeFile}</span>
          </button>

          {/* Pestaña Respuesta (visible si hay respuesta) */}
          {responseContent && (
            <button
              onClick={() => setActiveTab('response')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors text-[10px] font-medium ${
                activeTab === 'response'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-emerald-300'
              }`}
            >
              <Sparkles size={11} className="text-emerald-400" />
              <span>Respuesta</span>
            </button>
          )}

          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-pulse ml-0.5" />
        </div>

        {/* Acciones del encabezado */}
        <div className="flex items-center gap-2">
          {activeTab === 'response' && responseContent && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
              title="Copiar respuesta"
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          )}
          <span className="text-zinc-500 font-mono text-[10px]">
            #{stepIndex}
          </span>
        </div>
      </div>

      {/* Contenido según pestaña */}
      <div className="p-2.5 font-sans text-[11px] leading-relaxed flex-1 overflow-y-auto max-h-[96px] min-h-[90px] scrollbar-thin">
        {activeTab === 'response' && responseContent ? (
          <div className="flex flex-col gap-1 select-text">
            {formatMarkdownText(responseContent)}
          </div>
        ) : (
          /* Visor de código / Acciones / Diffs */
          <div className="font-mono text-[11px] flex flex-col gap-1">
            {diffLines && diffLines.length > 0 ? (
              diffLines.map((line, idx) => {
                if (line.type === 'del') {
                  return (
                    <div key={idx} className="bg-red-500/15 text-red-300 px-1.5 py-0.5 rounded flex items-center gap-2">
                      <span className="text-red-400/70 select-none text-[10px]">{10 + idx}</span>
                      <span className="truncate">{line.text}</span>
                    </div>
                  );
                }
                if (line.type === 'add') {
                  return (
                    <div key={idx} className="bg-emerald-500/15 text-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-2">
                      <span className="text-emerald-400/70 select-none text-[10px]">{10 + idx}</span>
                      <span className="truncate">{line.text}</span>
                    </div>
                  );
                }
                if (line.type === 'cmd') {
                  return (
                    <div key={idx} className="bg-zinc-800/80 text-cyan-300 px-2 py-1 rounded font-mono text-[10px] truncate">
                      {line.text}
                    </div>
                  );
                }
                if (line.type === 'done') {
                  return (
                    <div key={idx} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-1.5 rounded flex flex-col gap-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <span>{line.text}</span>
                      </div>
                      {responseContent && (
                        <button
                          onClick={() => setActiveTab('response')}
                          className="text-[10px] text-emerald-400 underline hover:text-emerald-200 text-left mt-0.5"
                        >
                          Haz clic para ver la respuesta completa →
                        </button>
                      )}
                    </div>
                  );
                }
                return (
                  <div key={idx} className="text-zinc-400 px-1 truncate flex items-center gap-2">
                    <span className="text-zinc-600 select-none text-[10px]">{10 + idx}</span>
                    <span>{line.text}</span>
                  </div>
                );
              })
            ) : responseContent ? (
              <div className="h-full flex flex-col justify-center items-center text-zinc-400 gap-1.5 py-2">
                <span>Respuesta lista</span>
                <button
                  onClick={() => setActiveTab('response')}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-md text-[11px] font-sans flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles size={12} className="text-amber-400" />
                  Ver respuesta
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-zinc-500 gap-1 text-[11px] py-2">
                <span className="text-zinc-400">{toolAction || 'En espera de instrucciones'}</span>
                <span className="text-[10px] text-zinc-600">Antigravity 2.0 en línea</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barra de estado inferior de la tarjeta */}
      <div className="px-3 py-1 bg-zinc-950/80 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <span className="truncate max-w-[220px] text-zinc-400">
          {toolAction || 'Listo para programar'}
        </span>
        <span className="text-zinc-600">
          {activeTab === 'code' ? 'código' : 'lectura'}
        </span>
      </div>
    </div>
  );
};
