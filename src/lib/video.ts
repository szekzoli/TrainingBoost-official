// A videóforrás egyetlen helyen: ha később Vimeo/Bunny lesz, csak ezt kell cserélni.
// Elfogad teljes YouTube linket (watch, youtu.be, embed, shorts) vagy sima 11 karakteres azonosítót.
export function getVideoEmbedUrl(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  const v = videoUrl.trim();
  let id: string | null = null;

  if (/^[\w-]{11}$/.test(v)) {
    id = v;
  } else {
    try {
      const u = new URL(v);
      if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
      else if (u.hostname.endsWith('youtube.com') || u.hostname.endsWith('youtube-nocookie.com')) {
        id = u.searchParams.get('v');
        if (!id) {
          const m = u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/);
          id = m ? m[1] : null;
        }
      }
    } catch {
      return null;
    }
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}
