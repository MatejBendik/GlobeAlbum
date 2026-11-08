export const GLOBE_STYLES = ["dotted", "atlas", "orbit"] as const;
export type GlobeStyle = (typeof GLOBE_STYLES)[number];

export const GLOBE_STYLE_OPTIONS = {
  dotted: { name: "Dotted", description: "Minimal land dots" },
  atlas: {
    name: "Minimal",
    description: "Grayscale outlines and country names",
  },
  orbit: { name: "Classic", description: "Colored land and country names" },
};
