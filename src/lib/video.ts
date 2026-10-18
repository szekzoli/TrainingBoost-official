// A videóforrás egyetlen helyen: ha később Vimeo/Bunny lesz, csak ezt kell cserélni.
// Elfogad teljes YouTube linket (watch, youtu.be, embed, shorts) vagy sima 11 karakteres azonosítót.
// A tracking és egyéb paramétereket (?si=, ?t=, ?feature=…) eldobja: csak a videó azonosítója számít.

export type VideoInfo = {
  embedUrl: string;
  /** Álló (9:16) videó, pl. YouTube Shorts. */
  vertical: boolean;
};

const ID_RE = /^[\w-]{11}$/;

function isYouTubeHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === 'youtube.com' ||
    h.endsWith('.youtube.com') ||
    h === 'youtube-nocookie.com' ||
    h.endsWith('.youtube-nocookie.com')
  );
}

export function getVideoInfo(videoUrl: string | null | undefined): VideoInfo | null {
  if (!videoUrl) return null;
  const v = videoUrl.trim();
  let id: string | null = null;
  let vertical = false;

  if (ID_RE.test(v)) {
    id = v;
  } else {
    try {
      const u = new URL(v);
      const host = u.hostname.toLowerCase();
      if (host === 'youtu.be') {
        id = u.pathname.split('/')[1] ?? null;
      } else if (isYouTubeHost(host)) {
        const m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{11})(?:\/|$)/);
        if (m) {
          id = m[2];
          vertical = m[1] === 'shorts';
        } else {
          id = u.searchParams.get('v');
        }
      }
    } catch {
      return null;
    }
  }
  if (!id || !ID_RE.test(id)) return null;
  return { embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0`, vertical };
}

export function getVideoEmbedUrl(videoUrl: string | null | undefined): string | null {
  return getVideoInfo(videoUrl)?.embedUrl ?? null;
}
