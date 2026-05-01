import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Returns false on the server and on first render, true after hydration. */
export function useHasMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
