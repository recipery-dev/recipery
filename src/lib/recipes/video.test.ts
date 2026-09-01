import { describe, it, expect } from "vitest";
import { youtubeVideoId, isYouTubeUrl, youtubeEmbedUrl } from "./video";

describe("youtubeVideoId", () => {
  it("reads the id from a standard watch URL", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=JaMnd5Rcyy0")).toBe("JaMnd5Rcyy0");
  });

  it("reads the id from a watch URL with extra query params", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch?v=abc123&t=42s&list=PL1")).toBe("abc123");
  });

  it("reads the id from a youtu.be short link", () => {
    expect(youtubeVideoId("https://youtu.be/abc123")).toBe("abc123");
  });

  it("reads the id from a youtu.be short link with a trailing query string", () => {
    expect(youtubeVideoId("https://youtu.be/abc123?t=10")).toBe("abc123");
  });

  it("reads the id from embed, shorts, and live paths", () => {
    expect(youtubeVideoId("https://www.youtube.com/embed/abc123")).toBe("abc123");
    expect(youtubeVideoId("https://www.youtube.com/shorts/abc123")).toBe("abc123");
    expect(youtubeVideoId("https://www.youtube.com/live/abc123")).toBe("abc123");
  });

  it("ignores the www. and m. subdomain prefixes", () => {
    expect(youtubeVideoId("https://m.youtube.com/watch?v=abc123")).toBe("abc123");
    expect(youtubeVideoId("https://youtube.com/watch?v=abc123")).toBe("abc123");
  });

  it("accepts the privacy-enhanced host too", () => {
    expect(youtubeVideoId("https://www.youtube-nocookie.com/embed/abc123")).toBe("abc123");
  });

  it("returns null for a watch URL with no v param", () => {
    expect(youtubeVideoId("https://www.youtube.com/watch")).toBeNull();
  });

  it("returns null for a non-YouTube URL", () => {
    expect(youtubeVideoId("https://vimeo.com/12345")).toBeNull();
    expect(youtubeVideoId("https://example.com/recipe")).toBeNull();
  });

  it("returns null for an unparseable string instead of throwing", () => {
    expect(youtubeVideoId("not a url")).toBeNull();
  });
});

describe("isYouTubeUrl", () => {
  it("matches recognized YouTube URL shapes", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=abc123")).toBe(true);
    expect(isYouTubeUrl("https://youtu.be/abc123")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isYouTubeUrl("https://example.com/some-recipe")).toBe(false);
  });
});

describe("youtubeEmbedUrl", () => {
  it("builds a youtube-nocookie.com embed URL from the video id", () => {
    expect(youtubeEmbedUrl("https://www.youtube.com/watch?v=abc123")).toBe(
      "https://www.youtube-nocookie.com/embed/abc123"
    );
    expect(youtubeEmbedUrl("https://youtu.be/abc123")).toBe("https://www.youtube-nocookie.com/embed/abc123");
  });

  it("returns null for a non-YouTube URL", () => {
    expect(youtubeEmbedUrl("https://example.com/video")).toBeNull();
  });
});
