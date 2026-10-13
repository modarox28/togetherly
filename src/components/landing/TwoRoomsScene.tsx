"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";

// Ilustración del hero: dos salas en ciudades distintas viendo lo mismo.
// Secuencia única al cargar (≈2,6 s):
//   0,35 s → se encienden las lámparas
//   1,1 s  → la señal de play viaja por la ruta punteada
//   2,55 s → las dos teles se encienden en el mismo instante
// Con "reducir movimiento" se muestra directamente el estado final.
//
// Coordenadas: el lienzo mide 800 × 470. Cada sala mide 352 × 304 y empieza en
// x = 16 (izquierda) o x = 432 (derecha), y = 150. Todo lo de adentro se dibuja
// relativo a esa esquina.

const VIEWBOX = { width: 800, height: 470 };
const ROOM = { width: 352, height: 304, top: 150 };
const LEFT_ROOM_X = 16;
const RIGHT_ROOM_X = 432;

// Ruta de la señal: de la tele izquierda a la derecha, pasando por arriba.
const SIGNAL_PATH = "M232 244 C 290 20, 590 20, 648 244";
const SCREEN_TIME = "42:10";

const TIMING = { lampsOn: 0.35, signalStart: 1.1, signalDuration: 1.4, screensOn: 2.55 };
const EASE = [0.45, 0, 0.2, 1] as const;

const COLORS = {
  wall: "#3A2E55",
  floor: "#2F2547",
  trim: "#4A3C68",
  frame: "#5E4F80",
  furniture: "#1E1730",
  screenOff: "#120C1E",
  lamp: "#FFC965",
  lampOff: "#5E4F80",
};

type SceneProps = { label: string };

export function TwoRoomsScene({ label }: SceneProps) {
  const reduceMotion = useReducedMotion();
  const pathRef = useRef<SVGPathElement>(null);
  const progress = useMotionValue(reduceMotion ? 1 : 0);
  const [signal, setSignal] = useState({ x: 232, y: 244, progress: reduceMotion ? 1 : 0 });
  const [screensOnAnimated, setScreensOn] = useState(false);
  const screensOn = !!reduceMotion || screensOnAnimated;

  // Mueve el círculo de play a lo largo de la ruta según el progreso (0 → 1).
  useMotionValueEvent(progress, "change", (value) => {
    const path = pathRef.current;
    if (!path) return;
    const point = path.getPointAtLength(path.getTotalLength() * value);
    setSignal({ x: point.x, y: point.y, progress: value });
  });

  useEffect(() => {
    if (reduceMotion) return;
    const travel = animate(progress, 1, {
      delay: TIMING.signalStart,
      duration: TIMING.signalDuration,
      ease: EASE,
    });
    const timer = setTimeout(() => setScreensOn(true), TIMING.screensOn * 1000);
    return () => {
      travel.stop();
      clearTimeout(timer);
    };
  }, [reduceMotion, progress]);

  const signalVisible = signal.progress > 0.001 && signal.progress < 0.995;

  return (
    <motion.svg
      viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
      role="img"
      aria-label={label}
      className="h-auto w-full select-none"
      initial={reduceMotion ? false : "off"}
      animate="on"
    >
      <SceneDefinitions />

      <Room x={LEFT_ROOM_X} id="left" sky="sky-dusk" screensOn={screensOn} sunset />
      <Room x={RIGHT_ROOM_X} id="right" sky="sky-night" screensOn={screensOn} sofaColors={["#9BC4A0", "#83AD89"]} />

      {/* Ruta punteada (se revela con una máscara que se dibuja de izquierda a derecha) */}
      <path ref={pathRef} d={SIGNAL_PATH} fill="none" stroke="none" />
      <path
        d={SIGNAL_PATH}
        fill="none"
        stroke={COLORS.lamp}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="0.1 13"
        mask="url(#signal-mask)"
      />

      {/* Señal de play viajando */}
      <g
        transform={`translate(${signal.x} ${signal.y})`}
        style={{ opacity: signalVisible ? 1 : 0, transition: "opacity .25s" }}
      >
        <circle r="17" fill={COLORS.lamp} />
        <path d="M-5 -7.5 L8 0 L-5 7.5 Z" fill="#2A2140" />
      </g>
    </motion.svg>
  );
}

// Degradados, máscara y recortes que usan las salas.
function SceneDefinitions() {
  return (
    <defs>
      <linearGradient id="sky-dusk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4A3C68" />
        <stop offset="0.55" stopColor="#E79AA3" />
        <stop offset="1" stopColor="#FFC965" />
      </linearGradient>
      <linearGradient id="sky-night" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#151024" />
        <stop offset="1" stopColor="#3A2E55" />
      </linearGradient>
      <linearGradient id="movie-frame" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7FB7BE" />
        <stop offset="1" stopColor="#F2A7B0" />
      </linearGradient>
      <radialGradient id="lamp-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FFC965" stopOpacity="0.55" />
        <stop offset="1" stopColor="#FFC965" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="tv-glow" cx="0.5" cy="0.4" r="0.6">
        <stop offset="0" stopColor="#9BC4A0" stopOpacity="0.35" />
        <stop offset="1" stopColor="#9BC4A0" stopOpacity="0" />
      </radialGradient>
      <mask id="signal-mask">
        <motion.path
          d={SIGNAL_PATH}
          fill="none"
          stroke="#fff"
          strokeWidth="10"
          variants={{ off: { pathLength: 0 }, on: { pathLength: 1 } }}
          transition={{ delay: TIMING.signalStart, duration: TIMING.signalDuration, ease: EASE }}
        />
      </mask>
      {[LEFT_ROOM_X, RIGHT_ROOM_X].map((x) => (
        <clipPath key={x} id={`room-${x === LEFT_ROOM_X ? "left" : "right"}`}>
          <rect x={x} y={ROOM.top} width={ROOM.width} height={ROOM.height} rx="30" />
        </clipPath>
      ))}
    </defs>
  );
}

type RoomProps = {
  x: number;
  id: "left" | "right";
  sky: string;
  screensOn: boolean;
  sunset?: boolean;
  sofaColors?: [string, string]; // [asiento, brazos]
};

function Room({ x, id, sky, screensOn, sunset = false, sofaColors = ["#E79AA3", "#D4848E"] }: RoomProps) {
  const y = ROOM.top;
  return (
    <g clipPath={`url(#room-${id})`}>
      {/* Pared y piso */}
      <rect x={x} y={y} width={ROOM.width} height={ROOM.height} fill={COLORS.wall} />
      <rect x={x} y={y + 236} width={ROOM.width} height="68" fill={COLORS.floor} />
      <path d={`M${x} ${y + 236} H${x + ROOM.width}`} stroke={COLORS.trim} strokeWidth="3" />

      <Window x={x} y={y} id={id} sky={sky} sunset={sunset} />
      <FloorLamp x={x} y={y} />

      {/* Brillo de la tele en la pared */}
      <motion.ellipse
        cx={x + 216}
        cy={y + 150}
        rx="130"
        ry="90"
        fill="url(#tv-glow)"
        initial={false}
        animate={{ opacity: screensOn ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      />

      <Television x={x} y={y} on={screensOn} />
      <Sofa x={x} y={y} colors={sofaColors} />
    </g>
  );
}

function Window({ x, y, id, sky, sunset }: { x: number; y: number; id: string; sky: string; sunset: boolean }) {
  const box = { x: x + 26, y: y + 30, width: 104, height: 92 };
  return (
    <>
      <clipPath id={`window-${id}`}>
        <rect {...box} rx="12" />
      </clipPath>
      <g clipPath={`url(#window-${id})`}>
        <rect {...box} rx="12" fill={`url(#${sky})`} />
        {sunset ? (
          <circle cx={x + 78} cy={y + 122} r="22" fill="#FFE3A3" />
        ) : (
          <>
            {/* Luna creciente: un círculo claro tapado por otro del color del cielo */}
            <circle cx={x + 102} cy={y + 56} r="13" fill="#F6EFF7" />
            <circle cx={x + 108} cy={y + 51} r="12" fill="url(#sky-night)" />
            {[[44, 50], [60, 82], [84, 70], [52, 104], [114, 98]].map(([sx, sy]) => (
              <circle key={`${sx}-${sy}`} cx={x + sx} cy={y + sy} r="1.6" fill="#F6EFF7" />
            ))}
          </>
        )}
      </g>
      <rect {...box} rx="12" fill="none" stroke={COLORS.frame} strokeWidth="6" />
      <path d={`M${x + 78} ${y + 30} V${y + 122} M${x + 26} ${y + 76} H${x + 130}`} stroke={COLORS.frame} strokeWidth="4" />
    </>
  );
}

function FloorLamp({ x, y }: { x: number; y: number }) {
  return (
    <>
      <motion.circle
        cx={x + 314}
        cy={y + 70}
        r="120"
        fill="url(#lamp-glow)"
        variants={{ off: { opacity: 0 }, on: { opacity: 1 } }}
        transition={{ delay: TIMING.lampsOn, duration: 0.9 }}
      />
      <path d={`M${x + 314} ${y + 82} V${y + 262}`} stroke={COLORS.furniture} strokeWidth="5" strokeLinecap="round" />
      <path d={`M${x + 296} ${y + 262} H${x + 332}`} stroke={COLORS.furniture} strokeWidth="6" strokeLinecap="round" />
      <motion.path
        d={`M${x + 296} ${y + 46} H${x + 332} L${x + 342} ${y + 84} H${x + 286} Z`}
        variants={{ off: { fill: COLORS.lampOff }, on: { fill: COLORS.lamp } }}
        transition={{ delay: TIMING.lampsOn, duration: 0.5 }}
      />
    </>
  );
}

function Television({ x, y, on }: { x: number; y: number; on: boolean }) {
  const screen = { x: x + 156, y: y + 106, width: 120, height: 78 };
  return (
    <>
      <rect x={x + 150} y={y + 214} width="132" height="34" rx="8" fill={COLORS.furniture} />
      <rect x={x + 148} y={y + 98} width="136" height="94" rx="12" fill={COLORS.furniture} />
      <path d={`M${x + 216} ${y + 192} V${y + 214}`} stroke={COLORS.furniture} strokeWidth="8" />
      <rect {...screen} rx="7" fill={COLORS.screenOff} />

      {/* La misma escena de película en las dos teles, con el mismo minuto */}
      <motion.g initial={false} animate={{ opacity: on ? 1 : 0 }} transition={{ duration: 0.35 }}>
        <rect {...screen} rx="7" fill="url(#movie-frame)" />
        <path
          d={`M${x + 156} ${y + 166} q26 -22 52 -6 t68 -10 V${y + 177} a7 7 0 0 1 -7 7 h-106 a7 7 0 0 1 -7 -7 Z`}
          fill="#2F2547"
        />
        <circle cx={x + 246} cy={y + 128} r="9" fill="#FFF3D1" />
        <rect x={x + 164} y={y + 112} width="50" height="16" rx="8" fill="#2A2140" opacity="0.85" />
        <path d={`M${x + 171} ${y + 115.5} l7 4.5 -7 4.5 Z`} fill={COLORS.lamp} />
        <text
          x={x + 182}
          y={y + 124}
          fontSize="10"
          fontWeight="700"
          fill="#F6EFF7"
          fontFamily="var(--font-nunito), sans-serif"
        >
          {SCREEN_TIME}
        </text>
      </motion.g>
    </>
  );
}

// Sofá visto de espaldas con alguien sentado.
function Sofa({ x, y, colors }: { x: number; y: number; colors: [string, string] }) {
  const [seat, arms] = colors;
  return (
    <>
      <circle cx={x + 112} cy={y + 218} r="20" fill={COLORS.furniture} />
      <path d={`M${x + 82} ${y + 262} q0 -30 30 -30 q30 0 30 30 Z`} fill={COLORS.furniture} />
      <rect x={x + 30} y={y + 246} width="188" height="58" rx="22" fill={seat} />
      <rect x={x + 22} y={y + 266} width="30" height="40" rx="12" fill={arms} />
      <rect x={x + 196} y={y + 266} width="30" height="40" rx="12" fill={arms} />
    </>
  );
}
