export const operatorName = "Matej Bendík";
export const operatorEmail = "matejbendik.mb@gmail.com";

export const operatorMailto = `mailto:${operatorEmail}`;
export const contentReportMailto = `${operatorMailto}?subject=${encodeURIComponent("GlobeAlbum content report")}&body=${encodeURIComponent(
  "GlobeAlbum page or content URL:\n\nWhich content are you reporting, and why do you believe it is illegal or violates the Terms of Service?\n\nYour name and contact email (omit where the law allows an anonymous report):\n\nI believe in good faith that the information in this report is accurate and complete.",
)}`;
