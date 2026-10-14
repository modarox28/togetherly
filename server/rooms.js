/* eslint-disable @typescript-eslint/no-require-imports -- servidor Node en CommonJS */
// Estado de las salas en memoria. Si el servidor se reinicia, las salas se vacían
// (es lo esperado: una sala solo existe mientras alguien está conectado).
const { cleanText } = require("./validation");

/** Tope técnico absoluto de personas por sala. */
const MAX_PARTICIPANTS = 20;
/** Tope de salas abiertas a la vez: protege la memoria del servidor gratis. */
const MAX_ROOMS = 2000;

const AVATAR_COLORS = ["#FFC965", "#F2A7B0", "#9BC4A0", "#A6A1D6", "#E9A06B", "#7FB7BE", "#D9A6C9"];

/** @type {Map<string, Room>} */
const rooms = new Map();

/**
 * @typedef {Object} Room
 * @property {string|null} host           socket.id de quien manda (el primero en entrar)
 * @property {Map<string, object>} participants
 * @property {string|null} videoUrl
 * @property {{playing: boolean, currentTime: number, updatedAt: number, known: boolean}} videoState
 *           known = ya alguien dio play/pausa/salto con un tiempo real
 * @property {boolean} isPublic
 * @property {string} name
 * @property {string} platform
 * @property {number} createdAt
 * @property {number} maxParticipants
 */

/** ¿Se puede abrir esta sala? (ya existe, o todavía hay cupo para salas nuevas) */
function canOpenRoom(roomId) {
  return rooms.has(roomId) || rooms.size < MAX_ROOMS;
}

function getOrCreateRoom(roomId, { isPublic = false, name = null, maxParticipants } = {}) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      host: null,
      participants: new Map(),
      videoUrl: null,
      videoState: { playing: false, currentTime: 0, updatedAt: Date.now(), known: false },
      isPublic: isPublic === true,
      name: cleanText(name, 40) || roomId,
      platform: "youtube",
      createdAt: Date.now(),
      maxParticipants: maxParticipants ?? MAX_PARTICIPANTS,
    });
  }
  return rooms.get(roomId);
}

/** Posición actual del video calculada por el servidor (no depende del reloj de cada persona). */
function currentPosition(videoState) {
  if (!videoState.playing) return videoState.currentTime;
  return videoState.currentTime + (Date.now() - videoState.updatedAt) / 1000;
}

/** Estado que recibe la extensión para ponerse al día. */
function stateForExtension(roomId) {
  const room = rooms.get(roomId);
  if (!room || !room.videoState.known) return { known: false };
  return { known: true, playing: room.videoState.playing, position: currentPosition(room.videoState) };
}

function colorForIndex(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/** Salas públicas con gente, para la página "Salas públicas". */
function listPublicRooms(limit = 100) {
  const list = [];
  for (const [id, room] of rooms.entries()) {
    if (!room.isPublic || room.participants.size === 0) continue;
    list.push({
      id,
      name: room.name || id,
      participants: room.participants.size,
      host: room.host ? room.participants.get(room.host)?.name : null,
      videoUrl: room.videoUrl,
      platform: room.platform || "youtube",
      createdAt: room.createdAt,
    });
  }
  return list.slice(0, limit);
}

module.exports = {
  MAX_PARTICIPANTS,
  MAX_ROOMS,
  canOpenRoom,
  rooms,
  getOrCreateRoom,
  currentPosition,
  stateForExtension,
  colorForIndex,
  listPublicRooms,
};
