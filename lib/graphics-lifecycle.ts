export function observeGraphicsContext(
  target: EventTarget,
  onLost: () => void,
  onRestored: () => void,
) {
  const lost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  target.addEventListener('webglcontextlost', lost);
  target.addEventListener('webglcontextrestored', onRestored);
  return () => {
    target.removeEventListener('webglcontextlost', lost);
    target.removeEventListener('webglcontextrestored', onRestored);
  };
}
