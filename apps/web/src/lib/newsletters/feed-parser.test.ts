import { describe, expect, it } from "vitest";
import { parseFeed } from "./feed-parser";
import { canonicalUrl, stripHtml } from "./text";

const meta = {
  name: "The Decoder",
  url: "https://the-decoder.com/feed/",
  source_key: "the_decoder",
  category: "media",
  priority: "high" as const,
  max_items: 2,
};

describe("parseFeed", () => {
  it("parses RSS items, strips CDATA/HTML and respects max_items", () => {
    const rss = `<rss><channel>
      <item><title><![CDATA[OpenAI ships agents]]></title><link>https://the-decoder.com/a/?utm_source=rss</link>
        <description><![CDATA[<p>Agents &amp; tools</p>]]></description><pubDate>Mon, 28 Sep 2026 10:00:00 GMT</pubDate></item>
      <item><title>Second</title><link>https://the-decoder.com/b</link></item>
      <item><title>Third</title><link>https://the-decoder.com/c</link></item>
    </channel></rss>`;

    const articles = parseFeed(rss, meta);

    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      title: "OpenAI ships agents",
      url: "https://the-decoder.com/a",
      summary: "Agents & tools",
      domain: "the-decoder.com",
      sourceKey: "the_decoder",
      publishedAt: "2026-09-28T10:00:00.000Z",
    });
  });

  it("parses Atom entries using the alternate link", () => {
    const atom = `<feed><entry><title>Claude update</title>
      <link rel="alternate" href="https://simonwillison.net/2026/Sep/1/claude/"/>
      <summary>Notes</summary><published>2026-09-01T00:00:00Z</published></entry></feed>`;

    const [article] = parseFeed(atom, { ...meta, url: "https://simonwillison.net/atom/everything/" });

    expect(article.url).toBe("https://simonwillison.net/2026/Sep/1/claude");
    expect(article.title).toBe("Claude update");
  });

  it("falls back to AI-looking links on HTML pages, resolving relative URLs", () => {
    const html = `<a href="/news/claude-for-teams">Introducing Claude for Teams today</a>
      <a href="/careers">Careers at the company</a>
      <a href="/news/claude-for-teams">Introducing Claude for Teams today</a>`;

    const articles = parseFeed(html, { ...meta, url: "https://www.anthropic.com/research", max_items: 5 });

    expect(articles.map((a) => a.url)).toEqual(["https://www.anthropic.com/news/claude-for-teams"]);
  });

  it("reads dates embedded in HTML link text and removes them from the title", () => {
    const html = `<a href="/engineering/managed-agents">Scaling Managed Agents Apr 08, 2026</a>`;
    const [article] = parseFeed(html, { ...meta, url: "https://www.anthropic.com/engineering" });
    expect(article.title).toBe("Scaling Managed Agents");
    expect(article.publishedAt.startsWith("2026-04-08")).toBe(true);
  });

  it("credits the real outlet for Google News items", () => {
    const rss = `<rss><channel><item>
      <title>China's AI agents can lie and scheme - Reuters</title>
      <link>https://news.google.com/rss/articles/CBMiabc?oc=5</link>
      <pubDate>Tue, 29 Sep 2026 16:07:08 GMT</pubDate>
      <source url="https://www.reuters.com">Reuters</source>
    </item></channel></rss>`;

    const [article] = parseFeed(rss, { ...meta, name: "Reuters IA", url: "https://news.google.com/rss/search?q=site:reuters.com" });

    expect(article).toMatchObject({
      title: "China's AI agents can lie and scheme",
      source: "Reuters",
      domain: "reuters.com",
      url: "https://news.google.com/rss/articles/CBMiabc?oc=5",
    });
  });

  it("uses the current date when the feed date is missing or invalid", () => {
    const rss = `<rss><item><title>OpenAI news</title><link>https://openai.com/x</link><pubDate>not a date</pubDate></item></rss>`;
    const [article] = parseFeed(rss, meta);
    expect(Number.isNaN(new Date(article.publishedAt).getTime())).toBe(false);
  });
});

describe("text helpers", () => {
  it("canonicalUrl removes tracking params and trailing slash but keeps real params", () => {
    expect(canonicalUrl("https://x.com/a/?utm_medium=x&id=3&fbclid=1")).toBe("https://x.com/a?id=3");
    expect(canonicalUrl("&amp;not a url/")).toBe("&not a url");
  });

  it("stripHtml removes double-encoded markup", () => {
    expect(stripHtml("&lt;p&gt;Hola&lt;/p&gt; mundo")).toBe("Hola mundo");
  });
});
