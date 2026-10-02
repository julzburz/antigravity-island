import React, { useEffect, useRef, useState, useId } from 'react';
import { BotEngine, type BotFrame, type Look } from '../bot/engine';
import { DEMI_VIEWBOX, RAYON } from '../bot/repere';
import { type StateId, STATE_BY_ID } from '../bot/states';
import { lookTarget, type Aim } from '../bot/gaze';

interface CircularPetProps {
  status?: 'idle' | 'thinking' | 'read' | 'edit' | 'bash' | 'done' | 'waiting' | 'error' | 'dizzy' | 'working' | 'cancelled';
  size?: number;
  onDizzyChange?: (isDizzy: boolean) => void;
}

// Estados reales de Bloub según la actividad de Antigravity
function mapStatusToBloubState(status: string): StateId {
  switch (status) {
    case 'thinking':
      return 'orbit'; // Anillos de órbita y mirada reflexiva de Bloub
    case 'edit':
      return 'thinking'; // Concentración y mirada de Bloub
    case 'bash':
      return 'alert'; // Alerta y energía de Bloub
    case 'read':
      return 'wide'; // Ojos atentos y abiertos de Bloub
    case 'waiting':
      return 'exclaim'; // Se transforma en '!' de alerta
    case 'done':
      return 'wink'; // Guiño característico de Bloub
    case 'error':
      return 'exclaim';
    case 'dizzy':
      return 'swirl'; // Remolino de mareo oficial de Bloub
    case 'working':
      return 'alert'; // Trabajo activo
    case 'cancelled':
      return 'wide'; // Detenido para editar: ojos atentos esperando instrucción
    default:
      return 'idle';
  }
}

// Secuencia oficial de estados de Bloub al hacer clic progresivo
const BLOUB_CLICK_STATES: StateId[] = ['wink', 'wide', 'alert', 'swirl', 'burst'];

export const CircularPet: React.FC<CircularPetProps> = ({
  status = 'idle',
  size = 56,
  onDizzyChange
}) => {
  const uid = useId().replace(/:/g, '-');
  const maskId = `bloub-mask-${uid}`;
  const engineRef = useRef<BotEngine | null>(null);

  const [activeState, setActiveState] = useState<StateId>(() => mapStatusToBloubState(status));
  const clickIndexRef = useRef<number>(-1);
  const clickResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lookTargetRef = useRef<Look | null>(null);
  const clockRef = useRef<number>(0);
  const svgRef = useRef<SVGSVGElement>(null);

  // Inicializar el auténtico motor de Bloub
  if (!engineRef.current) {
    engineRef.current = new BotEngine(RAYON, activeState, null, null);
  }

  const [frame, setFrame] = useState<BotFrame>(() => engineRef.current!.sample(0));

  // Actualizar estado cuando cambie la actividad de Antigravity (si no está en secuencia de clics)
  useEffect(() => {
    if (clickIndexRef.current === -1) {
      const targetState = mapStatusToBloubState(status);
      setActiveState(targetState);
      if (engineRef.current) {
        engineRef.current.setState(targetState, clockRef.current);
      }
    }
  }, [status]);

  // Seguimiento del cursor global usando las matemáticas de mirada de Bloub
  useEffect(() => {
    if ((window as any).electronAPI) {
      (window as any).electronAPI.onCursorMove((coords: { nx: number; ny: number }) => {
        const aim: Aim = {
          nx: coords.nx,
          ny: coords.ny,
          tour: 1,
          pointer: true
        };
        lookTargetRef.current = lookTarget(aim);
      });
    }
  }, []);

  // Clics interactivos usando las acciones auténticas de Bloub
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickResetTimerRef.current) {
      clearTimeout(clickResetTimerRef.current);
    }

    const nextIndex = (clickIndexRef.current + 1) % BLOUB_CLICK_STATES.length;
    clickIndexRef.current = nextIndex;
    const nextState = BLOUB_CLICK_STATES[nextIndex];

    setActiveState(nextState);
    if (engineRef.current) {
      engineRef.current.setState(nextState, clockRef.current);
    }

    // Si llega a 'swirl' (el remolino de mareo de Bloub), avisar al notch
    if (nextState === 'swirl') {
      onDizzyChange?.(true);
      setTimeout(() => {
        onDizzyChange?.(false);
      }, 3500);
    }

    // Volver al estado de Antigravity tras terminar la animación de la acción
    clickResetTimerRef.current = setTimeout(() => {
      clickIndexRef.current = -1;
      const normalState = mapStatusToBloubState(status);
      setActiveState(normalState);
      if (engineRef.current) {
        engineRef.current.setState(normalState, clockRef.current);
      }
    }, nextState === 'burst' ? 3000 : nextState === 'swirl' ? 3500 : 2000);
  };

  // Loop de renderizado del auténtico Bloub a 60 FPS
  useEffect(() => {
    let rafId = 0;
    let startTimestamp = 0;

    const tick = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsedSec = (timestamp - startTimestamp) / 1000;
      clockRef.current = elapsedSec;

      if (engineRef.current) {
        engineRef.current.setLook(lookTargetRef.current, elapsedSec);
        const newFrame = engineRef.current.sample(elapsedSec);
        setFrame(newFrame);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const VB = DEMI_VIEWBOX;
  const R = RAYON;

  return (
    <div
      onClick={handleClick}
      className="relative flex items-center justify-center cursor-pointer select-none group"
      style={{ width: size, height: size }}
      title="Haz clic para interactuar con Bloub"
    >
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`${-VB} ${-VB} ${VB * 2} ${VB * 2}`}
        className="select-none overflow-visible"
      >
        <defs>
          {/* Sombreado volumétrico Apple monocromático puro (blanco/perla) */}
          <radialGradient id={`appleGrad-${uid}`} cx="35%" cy="25%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#f4f4f5" />
            <stop offset="100%" stopColor="#d4d4d8" />
          </radialGradient>

          {/* Máscara de corte para ojos y cuerpo de Bloub */}
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x={-VB}
            y={-VB}
            width={VB * 2}
            height={VB * 2}
          >
            {/* Cuerpo blanco (visible) */}
            <path d={frame.bodyPath} fill="#fff" />
            {/* Ojos negros (perforaciones transparentes) */}
            {frame.eyes.map((eye, i) => (
              <path
                key={i}
                d={eye.d}
                transform={eye.matrix}
                opacity={eye.alpha}
                fill="#000"
              />
            ))}
            {frame.notch && (
              <circle
                cx={frame.notch.x}
                cy={frame.notch.y}
                r={frame.notch.r}
                fill="#000"
              />
            )}
          </mask>

          {/* Gradientes monocromáticos sutiles para los anillos orbitales de Bloub */}
          {frame.arcs.map((arc) => (
            <linearGradient
              key={arc.id}
              id={`${uid}-${arc.id}`}
              gradientUnits="userSpaceOnUse"
              x1={arc.grad.x1}
              y1={arc.grad.y1}
              x2={arc.grad.x2}
              y2={arc.grad.y2}
            >
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
              <stop offset="50%" stopColor="#e4e4e7" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0.1} />
            </linearGradient>
          ))}
        </defs>

        {/* Parte trasera de los anillos orbitales de Bloub (detrás del cuerpo) */}
        <g fill="none" strokeLinecap="round">
          {frame.arcs.map((arc) => (
            <path
              key={`b${arc.id}`}
              d={arc.back}
              stroke={`url(#${uid}-${arc.id})`}
              strokeWidth={arc.width * 0.9}
              opacity={arc.opacity}
            />
          ))}
        </g>

        {/* Partículas detrás del cuerpo (de la explosión burst de Bloub) */}
        {frame.dotsBehind && (
          <g>
            {frame.dots.map((dot, i) => {
              if (dot.d) {
                return (
                  <path
                    key={`pb${i}`}
                    d={dot.d}
                    fill="#f4f4f5"
                    opacity={dot.opacity}
                    transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`}
                  />
                );
              }
              return (
                <circle
                  key={`pb${i}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={dot.r}
                  fill="#f4f4f5"
                  opacity={dot.opacity}
                />
              );
            })}
          </g>
        )}

        {/* Cuerpo esférico perlado de Bloub con ojos perforados (negro puro) */}
        <g opacity={frame.bodyAlpha}>
          <rect
            x={-VB}
            y={-VB}
            width={VB * 2}
            height={VB * 2}
            fill={`url(#appleGrad-${uid})`}
            mask={`url(#${maskId})`}
          />
        </g>

        {/* Partículas frente al cuerpo (explosión de Bloub) */}
        {!frame.dotsBehind && (
          <g>
            {frame.dots.map((dot, i) => {
              if (dot.d) {
                return (
                  <path
                    key={`pf${i}`}
                    d={dot.d}
                    fill="#f4f4f5"
                    opacity={dot.opacity}
                    transform={`translate(${dot.x} ${dot.y}) rotate(${dot.rot ?? 0}) scale(${R})`}
                  />
                );
              }
              return (
                <circle
                  key={`pf${i}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={dot.r}
                  fill="#f4f4f5"
                  opacity={dot.opacity}
                />
              );
            })}
          </g>
        )}

        {/* Parte delantera de los anillos orbitales de Bloub (frente al cuerpo) */}
        <g fill="none" strokeLinecap="round">
          {frame.arcs.map((arc) => (
            <path
              key={`f${arc.id}`}
              d={arc.front}
              stroke={`url(#${uid}-${arc.id})`}
              strokeWidth={arc.width * 0.9}
              opacity={arc.opacity}
            />
          ))}
        </g>
      </svg>
    </div>
  );
};
export default CircularPet;
