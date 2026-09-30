import { describe, it, expect } from "vitest";
import { toCsv } from "../csv.js";

describe("toCsv", () => {
  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });

  it("serializes simple rows with a header", () => {
    const csv = toCsv([{ name: "Abebe", age: 30 }, { name: "Kebede", age: 25 }]);
    expect(csv).toBe("name,age\nAbebe,30\nKebede,25");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    const csv = toCsv([{ note: 'Contains, a comma and "quotes" and\na newline' }]);
    expect(csv).toBe('note\n"Contains, a comma and ""quotes"" and\na newline"');
  });

  it("respects an explicit column order/subset", () => {
    const csv = toCsv([{ a: 1, b: 2, c: 3 }], ["c", "a"]);
    expect(csv).toBe("c,a\n3,1");
  });

  it("renders null/undefined as an empty field", () => {
    const csv = toCsv([{ name: "Abebe", note: null }]);
    expect(csv).toBe("name,note\nAbebe,");
  });
});
