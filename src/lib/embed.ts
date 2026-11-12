export type EmbedTheme = "light" | "dark";
export type EmbedShape = "rectangle" | "square";

export function embedPath(username: string, theme: EmbedTheme) {
  return `/embed/${encodeURIComponent(username)}?theme=${theme}`;
}

export const EMBED_SANDBOX =
  "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox";

function htmlAttribute(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function embedHtml({
  origin,
  username,
  displayName,
  theme,
  shape,
}: {
  origin: string;
  username: string;
  displayName: string;
  theme: EmbedTheme;
  shape: EmbedShape;
}) {
  const url = new URL(embedPath(username, theme), origin);
  return `<iframe
  src="${htmlAttribute(url.toString())}"
  title="${htmlAttribute(`${displayName} — travel globe`)}"
  loading="lazy"
  sandbox="${EMBED_SANDBOX}"
  referrerpolicy="strict-origin-when-cross-origin"
  style="display: block; width: 100%; aspect-ratio: ${shape === "square" ? "1 / 1" : "16 / 10"}; border: 0; border-radius: 16px;"
></iframe>`;
}
