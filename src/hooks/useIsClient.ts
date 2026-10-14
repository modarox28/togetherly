import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * true en el navegador y false durante el render del servidor, sin parpadeos de hidratación.
 * Sirve para mostrar cosas que dependen de window, localStorage o del tema guardado.
 */
export function useIsClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
