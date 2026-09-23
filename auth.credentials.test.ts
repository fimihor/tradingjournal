import { describe, expect, it } from "vitest";
import { displayNameFromEmail, hashPassword, verifyPassword } from "./routers";

describe("credential account helpers", () => {
  it("creates a readable display name from an email local part", () => {
    expect(displayNameFromEmail("alex.morgan@example.com")).toBe("Alex Morgan");
    expect(displayNameFromEmail("new-trader_7@example.com")).toBe("New Trader 7");
  });

  it("hashes passwords and rejects an incorrect password", () => {
    const stored = hashPassword("correct-horse-battery");

    expect(stored).toContain(":");
    expect(verifyPassword("correct-horse-battery", stored)).toBe(true);
    expect(verifyPassword("not-the-password", stored)).toBe(false);
  });
});
