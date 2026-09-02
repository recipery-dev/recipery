/** Recognizes youtube.com/youtu.be links and pulls out the video ID, so a
 * pasted watch/share/shorts URL can be turned into an embeddable player. */
export function youtubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");

  if (host === "youtu.be") {
    return parsed.pathname.slice(1).split("/")[0] || null;
  }

  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
    const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
    if (match) return match[1];
  }

  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return youtubeVideoId(url) !== null;
}

/** Privacy-enhanced embed host — no cookies until playback starts. */
export function youtubeEmbedUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

/**
 * `mqdefault` (320x180) is a genuinely resized 16:9 crop and exists for
 * every video. The more common `hqdefault`/`sddefault` sizes are a fixed
 * 4:3 canvas with the video frame pasted in the middle — letterboxed with
 * black bars top and bottom — and `maxresdefault` is 16:9 but isn't always
 * generated, so it 404s for plenty of videos.
 */
export function youtubeThumbnailUrl(url: string): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}
