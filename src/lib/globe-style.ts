export const GLOBE_STYLES = ["dotted", "atlas", "orbit"] as const;
export type GlobeStyle = (typeof GLOBE_STYLES)[number];
