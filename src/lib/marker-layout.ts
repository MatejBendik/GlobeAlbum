export type ProjectedMarker = {
  id: string;
  x: number;
  y: number;
  selected: boolean;
};

export function choosePostcards(markers: ProjectedMarker[], maximum: number) {
  const placed: ProjectedMarker[] = [];
  const prioritized = [...markers].sort(
    (a, b) => Number(b.selected) - Number(a.selected),
  );
  for (const marker of prioritized) {
    if (placed.length >= maximum) break;
    if (
      placed.some(
        (other) =>
          Math.abs(other.x - marker.x) < 164 &&
          Math.abs(other.y - marker.y) < 190,
      )
    )
      continue;
    placed.push(marker);
  }
  return new Set(placed.map((marker) => marker.id));
}
