const reserved = new Set([
  "admin",
  "api",
  "demo",
  "settings",
  "support",
  "globealbum",
  "onboarding",
  "login",
]);
export function profileAddressBase(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
  if (!slug) return "traveler";
  if (slug.length < 3 || reserved.has(slug)) return `${slug}-globe`;
  return slug;
}
export function availableProfileAddress(base: string, taken: Set<string>) {
  let candidate = base;
  for (let suffix = 2; taken.has(candidate); suffix++) {
    const ending = `-${suffix}`;
    candidate = `${base.slice(0, 30 - ending.length).replace(/-+$/g, "")}${ending}`;
  }
  return candidate;
}
