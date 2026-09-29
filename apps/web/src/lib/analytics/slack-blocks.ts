/**
 * Long reports go to Slack as Block Kit sections: a plain `text` message is cut off by Slack,
 * and each section block holds at most 3,000 characters.
 */
const MAX_SECTION_CHARS = 2_900;
const MAX_BLOCKS = 50;

function splitLong(section: string): string[] {
  if (section.length <= MAX_SECTION_CHARS) return [section];
  const pieces: string[] = [];
  let current = "";
  for (const line of section.split("\n")) {
    if (current && current.length + line.length + 1 > MAX_SECTION_CHARS) {
      pieces.push(current);
      current = "";
    }
    current = current ? `${current}\n${line}` : line.slice(0, MAX_SECTION_CHARS);
  }
  return current ? [...pieces, current] : pieces;
}

/** One mrkdwn section per separator-delimited part, with dividers between parts. */
export function toSlackBlocks(message: string, separator: string): unknown[] {
  const blocks: unknown[] = [];
  message.split(separator).forEach((part, index) => {
    if (index > 0) blocks.push({ type: "divider" });
    splitLong(part.trim()).forEach((text) => blocks.push({ type: "section", text: { type: "mrkdwn", text } }));
  });
  return blocks.slice(0, MAX_BLOCKS);
}
