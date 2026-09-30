import { describe, it, expect } from "vitest";
import { toSkipTake, paginate } from "../pagination.js";

describe("toSkipTake", () => {
  it("computes skip/take for page 1", () => {
    expect(toSkipTake({ page: 1, pageSize: 20 })).toEqual({ skip: 0, take: 20 });
  });

  it("computes skip/take for later pages", () => {
    expect(toSkipTake({ page: 3, pageSize: 10 })).toEqual({ skip: 20, take: 10 });
  });
});

describe("paginate", () => {
  it("wraps items with correct metadata", () => {
    const result = paginate(["a", "b"], 42, { page: 2, pageSize: 2 });
    expect(result).toEqual({ items: ["a", "b"], page: 2, pageSize: 2, total: 42, totalPages: 21 });
  });

  it("always reports at least 1 total page, even for zero results", () => {
    const result = paginate([], 0, { page: 1, pageSize: 20 });
    expect(result.totalPages).toBe(1);
  });

  it("rounds totalPages up for a partial last page", () => {
    const result = paginate([], 21, { page: 1, pageSize: 20 });
    expect(result.totalPages).toBe(2);
  });
});
