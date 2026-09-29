import type { ReactNode } from "react";

const EMOJI: Record<string, string> = {
  robot_face: "🤖",
  zap: "⚡",
  art: "🎨",
  point_right: "👉",
  link: "🔗",
  bulb: "💡",
  rocket: "🚀",
  newspaper: "📰",
};

// Order matters: links first so "*" or "_" inside URLs are not treated as formatting.
const TOKEN_PATTERN = /<(https?:\/\/[^|>]+)\|([^>]+)>|\*([^*\n]+)\*|_([^_\n]+)_|:([a-z0-9_+-]+):/g;

function renderInline(line: string, lineKey: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of Array.from(line.matchAll(TOKEN_PATTERN))) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(line.slice(cursor, index));
    const key = `${lineKey}-${index}`;
    const [raw, href, label, bold, italic, emoji] = match;

    if (href) {
      nodes.push(
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-bright hover:underline">
          {label}
        </a>
      );
    } else if (bold) {
      nodes.push(<strong key={key} className="font-bold text-white">{bold}</strong>);
    } else if (italic) {
      nodes.push(<em key={key}>{italic}</em>);
    } else {
      nodes.push(EMOJI[emoji] ?? raw);
    }
    cursor = index + raw.length;
  }

  if (cursor < line.length) nodes.push(line.slice(cursor));
  return nodes;
}

interface SlackMessagePreviewProps {
  message: string;
}

/** Renders Slack mrkdwn as React nodes (no innerHTML), close to how it looks in the channel. */
export function SlackMessagePreview({ message }: SlackMessagePreviewProps) {
  return (
    <div className="text-[13px] leading-relaxed text-white/80 space-y-1">
      {message.split("\n").map((line, index) =>
        line.trim() ? <p key={index}>{renderInline(line, index)}</p> : <div key={index} className="h-2" aria-hidden />
      )}
    </div>
  );
}
