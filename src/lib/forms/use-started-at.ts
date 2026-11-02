"use client";

import { useRef, useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * The time trap's start: empty in the server HTML, the moment the form came alive in the browser
 * afterwards. React holds the value (it used to be written into the input from an effect, which
 * about 1 client navigation in 100 lost, leaving the field empty and the trap off).
 */
export function useStartedAt() {
  const at = useRef(0);
  return useSyncExternalStore(
    subscribe,
    () => String((at.current ||= Date.now())),
    () => "",
  );
}
