import { describe, it, expect } from "vitest";
import { isValidAbn, normaliseAbn } from "./abn";

describe("normaliseAbn", () => {
  it("strips spaces and non-digit characters", () => {
    expect(normaliseAbn("51 824 753 556")).toBe("51824753556");
    expect(normaliseAbn("51-824-753-556")).toBe("51824753556");
  });
});

describe("isValidAbn", () => {
  it("accepts a known-valid ABN (the ABR's own example)", () => {
    expect(isValidAbn("51824753556")).toBe(true);
  });

  it("accepts the same ABN with formatting", () => {
    expect(isValidAbn("51 824 753 556")).toBe(true);
  });

  it("rejects a value with the wrong number of digits", () => {
    expect(isValidAbn("5182475355")).toBe(false);
    expect(isValidAbn("518247535566")).toBe(false);
  });

  it("rejects a value that fails the checksum", () => {
    expect(isValidAbn("51824753557")).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(isValidAbn("not-an-abn")).toBe(false);
  });
});
