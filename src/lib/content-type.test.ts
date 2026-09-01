import { describe, it, expect } from "vitest";
import { contentTypeFor } from "./content-type";

describe("contentTypeFor", () => {
  it("maps known extensions to their MIME type", () => {
    expect(contentTypeFor("index.json")).toBe("application/json");
    expect(contentTypeFor("photo.png")).toBe("image/png");
    expect(contentTypeFor("photo.jpg")).toBe("image/jpeg");
    expect(contentTypeFor("photo.jpeg")).toBe("image/jpeg");
    expect(contentTypeFor("photo.webp")).toBe("image/webp");
    expect(contentTypeFor("photo.gif")).toBe("image/gif");
    expect(contentTypeFor("icon.svg")).toBe("image/svg+xml");
  });

  it("is case-insensitive about the extension", () => {
    expect(contentTypeFor("PHOTO.PNG")).toBe("image/png");
  });

  it("works with a full path, not just a bare filename", () => {
    expect(contentTypeFor("recipes/dracula-cake/image.jpg")).toBe("image/jpeg");
  });

  it("falls back to application/octet-stream for an unknown extension", () => {
    expect(contentTypeFor("archive.zip")).toBe("application/octet-stream");
  });

  it("falls back to application/octet-stream when there's no extension", () => {
    expect(contentTypeFor("README")).toBe("application/octet-stream");
  });
});
