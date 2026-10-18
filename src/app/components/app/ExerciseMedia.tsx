import { getVideoInfo } from '../../../lib/video';

// A gyakorlat médiakerete. Most csak videót tud; később ide kerülhet a képgaléria is.
// Vízszintes videó: 16:9, teljes szélesség. Álló videó (Shorts): 9:16, középre igazítva,
// legfeljebb 360 px széles és legfeljebb a kijelző magasságának ~80%-a, hogy telefonon is elférjen.
export default function ExerciseMedia({ name, videoUrl }: { name: string; videoUrl: string | null }) {
  const video = getVideoInfo(videoUrl);
  if (!video) return null;

  return (
    <div
      className={`overflow-hidden rounded-[14px] border border-[#D5DDE6] bg-black ${
        video.vertical ? 'mx-auto aspect-[9/16]' : 'aspect-video w-full'
      }`}
      style={video.vertical ? { width: 'min(100%, 360px, calc(80svh * 9 / 16))' } : undefined}
    >
      {/* A YouTube a beágyazáshoz kér origin-referrert; teljes URL nem megy ki. */}
      <iframe
        src={video.embedUrl}
        title={`${name} videó`}
        className="size-full"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="encrypted-media; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
