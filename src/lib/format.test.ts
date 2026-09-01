import { describe, it, expect } from "vitest";
import { formatBytes, formatAddedDate } from "./format";

describe("formatBytes", () => {
  it("shows bytes below 1024 with no decimal", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(0)).toBe("0 B");
  });

  it("shows one decimal place below 10 units", () => {
    expect(formatBytes(1024 * 5)).toBe("5.0 KB");
    expect(formatBytes(1024 * 9.5)).toBe("9.5 KB");
  });

  it("shows no decimal place at or above 10 units", () => {
    expect(formatBytes(1024 * 10)).toBe("10 KB");
    expect(formatBytes(1024 * 1024 * 250)).toBe("250 MB");
  });

  it("climbs through KB/MB/GB as the value grows", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.0 GB");
  });

  it("stops climbing units past GB, the largest unit in the table", () => {
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1024 GB");
  });
});

describe("formatAddedDate", () => {
  it("formats an ISO date as a long-form date", () => {
    expect(formatAddedDate("2024-03-05T00:00:00.000Z")).toMatch(/March/);
    expect(formatAddedDate("2024-03-05T00:00:00.000Z")).toMatch(/2024/);
  });
});
