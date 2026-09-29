import { describe, expect, it } from "vitest";
import { extractPageSummary } from "./page-extract";

const PAGE = `<html><head>
  <title>Onboarding guide | AIHR</title>
  <meta property="og:title" content="Employee Onboarding: The Complete Guide">
  <meta name="description" content="How to design a 30-60-90 day onboarding that new hires love.">
</head><body>
  <nav><p>Home · Blog · Courses · Pricing and plans for every HR team size</p></nav>
  <article>
    <h1>Employee Onboarding</h1>
    <p>Short.</p>
    <p>Onboarding is the process of integrating a new employee into the organization and its culture.</p>
    <p>A structured 30-60-90 day plan gives new hires clear goals and gives managers checkpoints to review progress.</p>
  </article>
  <footer><p>Copyright AIHR, all rights reserved, subscribe to our newsletter today</p></footer>
</body></html>`;

describe("extractPageSummary", () => {
  it("prefers Open Graph title and meta description", () => {
    const summary = extractPageSummary(PAGE);
    expect(summary.title).toBe("Employee Onboarding: The Complete Guide");
    expect(summary.description).toBe("How to design a 30-60-90 day onboarding that new hires love.");
  });

  it("takes meaningful article paragraphs and skips nav, footer and short lines", () => {
    const { text } = extractPageSummary(PAGE);
    expect(text).toContain("Onboarding is the process of integrating");
    expect(text).toContain("30-60-90 day plan");
    expect(text).not.toContain("Pricing");
    expect(text).not.toContain("Copyright");
    expect(text).not.toContain("Short.");
  });

  it("caps the text length", () => {
    expect(extractPageSummary(PAGE, 120).text.length).toBeLessThanOrEqual(120);
  });

  it("falls back to <title> when there is no Open Graph data", () => {
    expect(extractPageSummary("<title>Guía de NOM-035 &amp; bienestar</title>").title).toBe("Guía de NOM-035 & bienestar");
  });
});
