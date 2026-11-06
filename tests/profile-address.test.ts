import { describe, expect, it } from "vitest";
import {
  profileAddressBase,
  availableProfileAddress,
} from "../src/lib/profile-address";
import { profileSchema } from "../src/lib/validation";
describe("generated profile addresses", () => {
  it.each([
    ["Matej Bendík", "matej-bendik"],
    ["  Jamie's globe! ", "jamie-s-globe"],
    ["李", "traveler"],
    ["Al", "al-globe"],
    ["Admin", "admin-globe"],
  ])("normalizes %s to %s", (name, expected) => {
    expect(profileAddressBase(name)).toBe(expected);
    expect(
      profileSchema.safeParse({ displayName: name, username: expected })
        .success,
    ).toBe(true);
  });
  it("keeps long names and collision suffixes within the immutable slug limit", () => {
    const base = profileAddressBase("a".repeat(60));
    const second = availableProfileAddress(base, new Set([base]));
    expect(second).toHaveLength(30);
    expect(second.endsWith("-2")).toBe(true);
    expect(availableProfileAddress(base, new Set([base, second]))).toMatch(
      /-3$/,
    );
  });
});
