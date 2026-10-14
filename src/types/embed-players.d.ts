// Tipos mínimos de los reproductores de Twitch y Vimeo que se cargan con <script>.
// Solo incluyen lo que usa Togetherly (ver src/components/room/players/).

interface TwitchPlayerOptions {
  width: string;
  height: string;
  autoplay: boolean;
  parent: string[];
  video?: string;
  channel?: string;
}

interface TwitchPlayer {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  addEventListener(event: string, callback: () => void): void;
}

interface TwitchPlayerConstructor {
  new (element: HTMLElement, options: TwitchPlayerOptions): TwitchPlayer;
  READY: string;
  PLAY: string;
  PAUSE: string;
}

interface VimeoPlayer {
  play(): Promise<void>;
  pause(): Promise<void>;
  setCurrentTime(seconds: number): Promise<number>;
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number>;
  setVolume(volume: number): Promise<number>;
  destroy(): Promise<void>;
  on(event: "play" | "pause", callback: () => void): void;
  on(event: "timeupdate", callback: (data: { seconds: number }) => void): void;
}

interface Window {
  Twitch?: { Player: TwitchPlayerConstructor };
  Vimeo?: { Player: new (element: HTMLIFrameElement) => VimeoPlayer };
}
