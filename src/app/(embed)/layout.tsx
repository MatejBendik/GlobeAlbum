import "./embed.css";

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="embed-root">{children}</div>;
}
