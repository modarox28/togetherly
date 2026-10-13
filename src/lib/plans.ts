// Planes de Togetherly. Este archivo no tiene secretos: lo pueden importar
// tanto el navegador (página de planes) como el servidor.
// Regla: solo se anuncia lo que existe y se puede comprobar.

export const PLANS = {
  free: {
    name: "Gratis",
    priceMonthly: "$0",
    maxParticipants: 2,
    features: [
      "Salas de 2 personas",
      "Netflix, Prime Video, HBO Max, Disney+ y más con la extensión",
      "YouTube, Twitch, Vimeo y Spotify dentro de la sala",
      "Chat, reacciones y videollamada",
      "Salas públicas",
    ],
  },
  premium: {
    name: "Premium",
    priceMonthly: "$3.99",
    maxParticipants: 8,
    features: [
      "Salas de hasta 8 personas para ver en grupo",
      "Todo lo del plan Gratis",
      "Insignia Premium en la sala",
      "Apoyas que Togetherly siga creciendo",
    ],
  },
} as const;

export type PlanId = keyof typeof PLANS;
