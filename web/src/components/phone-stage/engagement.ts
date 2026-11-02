/**
 * Whether the visitor has touched, scrolled or pressed a key on this page load. Below desktop the 3D phone
 * waits for that, so a phone paints the page and becomes responsive before it spends time on WebGL. Once set
 * it stays set, so the 3D phone never unmounts again.
 */
let engaged = false;
const listeners = new Set<() => void>();
const EVENTS = ["pointerdown", "touchstart", "wheel", "scroll", "keydown"] as const;

function attach() {
  for (const type of EVENTS) window.addEventListener(type, engage, { passive: true });
}

function detach() {
  for (const type of EVENTS) window.removeEventListener(type, engage);
}

export function engage() {
  if (engaged) return;
  engaged = true;
  detach();
  for (const listener of listeners) listener();
}

export function subscribeEngaged(onChange: () => void) {
  listeners.add(onChange);
  if (!engaged && listeners.size === 1) attach();
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) detach();
  };
}

export const isEngaged = () => engaged;

/** For tests. */
export function resetEngaged() {
  engaged = false;
}
