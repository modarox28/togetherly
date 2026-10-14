// Avatares para elegir al entrar a una sala. Son personajes propios de Togetherly
// (sin marcas registradas): se pueden usar libremente aunque la app cobre.
// Para agregar uno: un id único en minúsculas, un nombre, un emoji y una frase corta.

export interface Character {
  id: string;
  name: string;
  emoji: string;
  /** Frase corta que se muestra al elegirlo */
  tagline: string;
}

export const CHARACTERS: Character[] = [
  { id: "palomita", name: "Palomita", emoji: "🍿", tagline: "Nunca falta en la noche de cine" },
  { id: "luna", name: "Luna", emoji: "🌙", tagline: "Ve películas de madrugada" },
  { id: "michi", name: "Michi", emoji: "🐈", tagline: "Se duerme a la mitad" },
  { id: "buho", name: "Búho", emoji: "🦉", tagline: "No se pierde ningún final" },
  { id: "zorro", name: "Zorro", emoji: "🦊", tagline: "Adivina el giro antes de tiempo" },
  { id: "panda", name: "Panda", emoji: "🐼", tagline: "Pide pausa para el snack" },
  { id: "pulpo", name: "Pulpo", emoji: "🐙", tagline: "Maneja tres controles a la vez" },
  { id: "cactus", name: "Cactus", emoji: "🌵", tagline: "No llora con nada… o eso dice" },
  { id: "girasol", name: "Girasol", emoji: "🌻", tagline: "Siempre elige comedias" },
  { id: "cometa", name: "Cometa", emoji: "☄️", tagline: "Llega tarde, pero llega" },
  { id: "tortuga", name: "Tortuga", emoji: "🐢", tagline: "Va a su ritmo con los subtítulos" },
  { id: "tinto", name: "Tinto", emoji: "☕", tagline: "Aguanta despierto hasta los créditos" },
  { id: "arepa", name: "Arepa", emoji: "🫓", tagline: "Siempre trae la comida" },
  { id: "loro", name: "Loro", emoji: "🦜", tagline: "Se sabe los diálogos de memoria" },
  { id: "estrella", name: "Estrella", emoji: "⭐", tagline: "Le pone cinco a todo" },
  { id: "lampara", name: "Lámpara", emoji: "💡", tagline: "Deja una luz encendida" },
];

/** Avatar por defecto si el guardado ya no existe (p. ej. un personaje viejo). */
export const DEFAULT_AVATAR = "🍿";
