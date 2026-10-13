"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion } from "framer-motion";

// Ilustración del hero: dos salas en ciudades distintas.
// Secuencia única al cargar: se encienden las lámparas → la señal de play viaja
// por la ruta punteada → las dos teles se encienden en el mismo instante.

const RUTA = "M232 244 C 290 20, 590 20, 648 244";
const TIEMPO_PANTALLA = "42:10";

type Props = { etiqueta: string };

export function SalaDoble({ etiqueta }: Props) {
  const reducir = useReducedMotion();
  const rutaRef = useRef<SVGPathElement>(null);
  const progreso = useMotionValue(reducir ? 1 : 0);
  const [punto, setPunto] = useState({ x: 232, y: 244, v: reducir ? 1 : 0 });
  const [encendidasAnim, setEncendidas] = useState(false);
  const encendidas = !!reducir || encendidasAnim;

  useMotionValueEvent(progreso, "change", (v) => {
    const ruta = rutaRef.current;
    if (!ruta) return;
    const p = ruta.getPointAtLength(ruta.getTotalLength() * v);
    setPunto({ x: p.x, y: p.y, v });
  });

  useEffect(() => {
    if (reducir) return;
    const control = animate(progreso, 1, { delay: 1.1, duration: 1.4, ease: [0.45, 0, 0.2, 1] });
    const t = setTimeout(() => setEncendidas(true), 2550);
    return () => {
      control.stop();
      clearTimeout(t);
    };
  }, [reducir, progreso]);

  const entrada = reducir ? false : "apagado";

  return (
    <motion.svg
      viewBox="0 0 800 470"
      role="img"
      aria-label={etiqueta}
      className="w-full h-auto select-none"
      initial={entrada}
      animate="encendido"
    >
      <defs>
        <linearGradient id="cielo-tarde" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4A3C68" />
          <stop offset="0.55" stopColor="#E79AA3" />
          <stop offset="1" stopColor="#FFC965" />
        </linearGradient>
        <linearGradient id="cielo-noche" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#151024" />
          <stop offset="1" stopColor="#3A2E55" />
        </linearGradient>
        <linearGradient id="peli" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7FB7BE" />
          <stop offset="1" stopColor="#F2A7B0" />
        </linearGradient>
        <radialGradient id="luz" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFC965" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFC965" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="brillo-tv" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#9BC4A0" stopOpacity="0.35" />
          <stop offset="1" stopColor="#9BC4A0" stopOpacity="0" />
        </radialGradient>
        <mask id="mascara-ruta">
          <motion.path
            d={RUTA}
            fill="none"
            stroke="#fff"
            strokeWidth="10"
            variants={{ apagado: { pathLength: 0 }, encendido: { pathLength: 1 } }}
            transition={{ delay: 1.1, duration: 1.4, ease: [0.45, 0, 0.2, 1] }}
          />
        </mask>
        <clipPath id="sala-izq"><rect x="16" y="150" width="352" height="304" rx="30" /></clipPath>
        <clipPath id="sala-der"><rect x="432" y="150" width="352" height="304" rx="30" /></clipPath>
      </defs>

      <Sala x={16} clip="sala-izq" cielo="cielo-tarde" encendida={encendidas} tarde />
      <Sala x={432} clip="sala-der" cielo="cielo-noche" encendida={encendidas} sofa={["#9BC4A0", "#83AD89"]} />

      {/* Ruta punteada entre las dos teles */}
      <path ref={rutaRef} d={RUTA} fill="none" stroke="none" />
      <path
        d={RUTA}
        fill="none"
        stroke="#FFC965"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="0.1 13"
        mask="url(#mascara-ruta)"
      />

      {/* Señal de play viajando */}
      <g
        transform={`translate(${punto.x} ${punto.y})`}
        style={{ opacity: punto.v > 0.001 && punto.v < 0.995 ? 1 : 0, transition: "opacity .25s" }}
      >
        <circle r="17" fill="#FFC965" />
        <path d="M-5 -7.5 L8 0 L-5 7.5 Z" fill="#2A2140" />
      </g>
    </motion.svg>
  );
}

function Sala({
  x, clip, cielo, encendida, tarde = false, sofa = ["#E79AA3", "#D4848E"],
}: { x: number; clip: string; cielo: string; encendida: boolean; tarde?: boolean; sofa?: string[] }) {
  const y = 150;
  return (
    <g clipPath={`url(#${clip})`}>
      {/* Pared y piso */}
      <rect x={x} y={y} width="352" height="304" fill="#3A2E55" />
      <rect x={x} y={y + 236} width="352" height="68" fill="#2F2547" />
      <path d={`M${x} ${y + 236} H${x + 352}`} stroke="#4A3C68" strokeWidth="3" />

      {/* Ventana */}
      <clipPath id={`ventana-${clip}`}>
        <rect x={x + 26} y={y + 30} width="104" height="92" rx="12" />
      </clipPath>
      <g clipPath={`url(#ventana-${clip})`}>
        <rect x={x + 26} y={y + 30} width="104" height="92" rx="12" fill={`url(#${cielo})`} />
        {tarde ? (
          <circle cx={x + 78} cy={y + 122} r="22" fill="#FFE3A3" />
        ) : (
          <>
            <circle cx={x + 102} cy={y + 56} r="13" fill="#F6EFF7" />
            <circle cx={x + 108} cy={y + 51} r="12" fill="url(#cielo-noche)" />
            {[[44, 50], [60, 82], [84, 70], [52, 104], [114, 98]].map(([sx, sy]) => (
              <circle key={`${sx}-${sy}`} cx={x + sx} cy={y + sy} r="1.6" fill="#F6EFF7" />
            ))}
          </>
        )}
      </g>
      <g>
        <rect x={x + 26} y={y + 30} width="104" height="92" rx="12" fill="none" stroke="#5E4F80" strokeWidth="6" />
        <path d={`M${x + 78} ${y + 30} V${y + 122} M${x + 26} ${y + 76} H${x + 130}`} stroke="#5E4F80" strokeWidth="4" />
      </g>

      {/* Lámpara de pie y su luz */}
      <motion.circle
        cx={x + 314} cy={y + 70} r="120"
        fill="url(#luz)"
        variants={{ apagado: { opacity: 0 }, encendido: { opacity: 1 } }}
        transition={{ delay: 0.35, duration: 0.9 }}
      />
      <path d={`M${x + 314} ${y + 82} V${y + 262}`} stroke="#1E1730" strokeWidth="5" strokeLinecap="round" />
      <path d={`M${x + 296} ${y + 262} H${x + 332}`} stroke="#1E1730" strokeWidth="6" strokeLinecap="round" />
      <motion.path
        d={`M${x + 296} ${y + 46} H${x + 332} L${x + 342} ${y + 84} H${x + 286} Z`}
        variants={{ apagado: { fill: "#5E4F80" }, encendido: { fill: "#FFC965" } }}
        transition={{ delay: 0.35, duration: 0.5 }}
      />

      {/* Brillo de la tele en la pared */}
      <motion.ellipse
        cx={x + 216} cy={y + 150} rx="130" ry="90"
        fill="url(#brillo-tv)"
        initial={false}
        animate={{ opacity: encendida ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      />

      {/* Mueble y tele */}
      <rect x={x + 150} y={y + 214} width="132" height="34" rx="8" fill="#1E1730" />
      <rect x={x + 148} y={y + 98} width="136" height="94" rx="12" fill="#1E1730" />
      <path d={`M${x + 216} ${y + 192} V${y + 214}`} stroke="#1E1730" strokeWidth="8" />
      <rect x={x + 156} y={y + 106} width="120" height="78" rx="7" fill="#120C1E" />
      <motion.g initial={false} animate={{ opacity: encendida ? 1 : 0 }} transition={{ duration: 0.35 }}>
        <rect x={x + 156} y={y + 106} width="120" height="78" rx="7" fill="url(#peli)" />
        <path
          d={`M${x + 156} ${y + 166} q26 -22 52 -6 t68 -10 V${y + 177} a7 7 0 0 1 -7 7 h-106 a7 7 0 0 1 -7 -7 Z`}
          fill="#2F2547"
        />
        <circle cx={x + 246} cy={y + 128} r="9" fill="#FFF3D1" />
        <rect x={x + 164} y={y + 112} width="50" height="16" rx="8" fill="#2A2140" opacity="0.85" />
        <path d={`M${x + 171} ${y + 115.5} l7 4.5 -7 4.5 Z`} fill="#FFC965" />
        <text x={x + 182} y={y + 124} fontSize="10" fontWeight="700" fill="#F6EFF7" fontFamily="var(--font-nunito), sans-serif">
          {TIEMPO_PANTALLA}
        </text>
      </motion.g>

      {/* Sofá visto de espaldas con alguien sentado */}
      <circle cx={x + 112} cy={y + 218} r="20" fill="#1E1730" />
      <path d={`M${x + 82} ${y + 262} q0 -30 30 -30 q30 0 30 30 Z`} fill="#1E1730" />
      <rect x={x + 30} y={y + 246} width="188" height="58" rx="22" fill={sofa[0]} />
      <rect x={x + 22} y={y + 266} width="30" height="40" rx="12" fill={sofa[1]} />
      <rect x={x + 196} y={y + 266} width="30" height="40" rx="12" fill={sofa[1]} />
    </g>
  );
}
