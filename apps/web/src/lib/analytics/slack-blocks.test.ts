import { describe, expect, it } from "vitest";
import { toSlackBlocks } from "./slack-blocks";

describe("toSlackBlocks", () => {
  it("makes one section per part with dividers between them", () => {
    expect(toSlackBlocks("a|b", "|")).toEqual([
      { type: "section", text: { type: "mrkdwn", text: "a" } },
      { type: "divider" },
      { type: "section", text: { type: "mrkdwn", text: "b" } },
    ]);
  });

  it("splits a section longer than Slack allows on line breaks", () => {
    const long = Array.from({ length: 100 }, (_, i) => `línea ${i} ${"x".repeat(50)}`).join("\n");
    const blocks = toSlackBlocks(long, "|") as Array<{ text: { text: string } }>;
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((block) => block.text.text.length <= 2_900)).toBe(true);
    expect(blocks.map((block) => block.text.text).join("\n")).toBe(long);
  });
});
