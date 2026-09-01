import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("verifies the correct password against its own hash", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("correct horse battery staple", stored)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const stored = hashPassword("correct horse battery staple");
    expect(verifyPassword("wrong password", stored)).toBe(false);
  });

  it("produces a different salt (and hash) each time for the same password", () => {
    const first = hashPassword("same password");
    const second = hashPassword("same password");
    expect(first).not.toBe(second);
    expect(verifyPassword("same password", first)).toBe(true);
    expect(verifyPassword("same password", second)).toBe(true);
  });

  it("rejects a stored value with no salt/hash separator instead of throwing", () => {
    expect(verifyPassword("anything", "not-a-valid-stored-hash")).toBe(false);
  });

  it("rejects an empty stored value instead of throwing", () => {
    expect(verifyPassword("anything", "")).toBe(false);
  });
});
