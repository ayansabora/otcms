import { describe, it, expect } from "vitest";
import { matchesDeclaredType } from "../fileSignature";

describe("matchesDeclaredType", () => {
  it("accepts a real PDF signature", () => {
    const buf = Buffer.from("%PDF-1.7\n...rest of file...");
    expect(matchesDeclaredType(buf, "application/pdf")).toBe(true);
  });

  it("rejects a file claiming to be a PDF but isn't", () => {
    const buf = Buffer.from("MZ\x90\x00this-is-actually-an-exe");
    expect(matchesDeclaredType(buf, "application/pdf")).toBe(false);
  });

  it("accepts a real JPEG signature", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(matchesDeclaredType(buf, "image/jpeg")).toBe(true);
  });

  it("accepts a real PNG signature", () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(matchesDeclaredType(buf, "image/png")).toBe(true);
  });

  it("rejects a PNG-claimed file with JPEG bytes", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(matchesDeclaredType(buf, "image/png")).toBe(false);
  });

  it("accepts a docx (ZIP container signature)", () => {
    const buf = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    expect(
      matchesDeclaredType(buf, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ).toBe(true);
  });

  it("rejects an unknown declared type outright", () => {
    const buf = Buffer.from("anything");
    expect(matchesDeclaredType(buf, "application/x-msdownload")).toBe(false);
  });

  it("rejects a buffer too short to contain a valid signature", () => {
    expect(matchesDeclaredType(Buffer.from([0x89]), "image/png")).toBe(false);
  });
});
