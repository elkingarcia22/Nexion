import { describe, expect, it } from "vitest";
import { describeServiceKeyProblem } from "./repository";

function jwt(role: string): string {
  const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64").replace(/=+$/, "");
  return `${b64({ alg: "HS256" })}.${b64({ role, iss: "supabase" })}.signature`;
}

describe("describeServiceKeyProblem", () => {
  it("accepts the service_role key and new secret keys", () => {
    expect(describeServiceKeyProblem(jwt("service_role"))).toBeNull();
    expect(describeServiceKeyProblem("sb_secret_abc123")).toBeNull();
  });

  it("explains when the anon or publishable key was configured by mistake", () => {
    expect(describeServiceKeyProblem(jwt("anon"))).toMatch(/"anon" en lugar de "service_role"/);
    expect(describeServiceKeyProblem("sb_publishable_abc")).toMatch(/publishable/);
    expect(describeServiceKeyProblem("not-a-key")).toMatch(/formato/);
  });
});
