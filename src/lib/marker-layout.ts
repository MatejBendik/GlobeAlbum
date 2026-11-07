export type ProjectedMarker = {
  id: string;
  x: number;
  y: number;
  selected: boolean;
};

export function postcardScale(cameraDistance: number) {
  return Math.min(1.18, Math.max(0.48, 2 / cameraDistance));
}

export function choosePostcards(
  markers: ProjectedMarker[],
  maximum: number,
  scale: number,
) {
  const placed: ProjectedMarker[] = [];
  const prioritized = [...markers].sort(
    (a, b) => Number(b.selected) - Number(a.selected),
  );
  for (const marker of prioritized) {
    if (placed.length >= maximum) break;
    if (
      placed.some(
        (other) =>
          Math.abs(other.x - marker.x) < 150 * scale &&
          Math.abs(other.y - marker.y) < 178 * scale,
      )
    )
      continue;
    placed.push(marker);
  }
  return new Set(placed.map((marker) => marker.id));
}
