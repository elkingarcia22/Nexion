import { decodeEntities, squish, stripHtml } from "./text";

const DEFAULT_MAX_TEXT_CHARS = 1500;
const MIN_PARAGRAPH_CHARS = 60;

export interface PageSummary {
  title: string;
  description: string;
  /** First meaningful paragraphs of the article body. */
  text: string;
}

function metaContent(html: string, names: string[]): string {
  for (const name of names) {
    const pattern = new RegExp(
      `<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`,
      "i"
    );
    const match = html.match(pattern);
    const value = match?.[1] ?? match?.[2];
    if (value) return squish(decodeEntities(value));
  }
  return "";
}

/** Prefer <article>/<main> so navigation and footers do not leak into the summary. */
function mainContent(html: string): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, " ");
  return cleaned.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? cleaned.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? cleaned;
}

/** Title, description and the opening paragraphs of an article page, as plain text. */
export function extractPageSummary(html: string, maxTextChars = DEFAULT_MAX_TEXT_CHARS): PageSummary {
  const title =
    metaContent(html, ["og:title", "twitter:title"]) || stripHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const description = metaContent(html, ["description", "og:description", "twitter:description"]);

  const paragraphs = Array.from(mainContent(html).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => stripHtml(match[1]))
    .filter((paragraph) => paragraph.length >= MIN_PARAGRAPH_CHARS);

  let text = "";
  for (const paragraph of paragraphs) {
    if (text.length + paragraph.length > maxTextChars) {
      text = text || paragraph.slice(0, maxTextChars);
      break;
    }
    text = text ? `${text}\n${paragraph}` : paragraph;
  }
  return { title, description, text };
}
