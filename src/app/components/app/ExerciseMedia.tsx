import { useState } from 'react';
import { getVideoInfo } from '../../../lib/video';

// A gyakorlat médiakerete: kép (ha van) és videó (ha van).
// Vízszintes videó: 16:9, teljes szélesség. Álló videó (Shorts): 9:16, középre igazítva,
// legfeljebb 360 px széles és legfeljebb a kijelző magasságának ~80%-a, hogy telefonon is elférjen.
export default function ExerciseMedia({
  name,
  videoUrl,
  imageUrl,
}: {
  name: string;
  videoUrl: string | null;
  imageUrl?: string | null;
}) {
  const video = getVideoInfo(videoUrl);
  const image = imageUrl?.trim() || null;
  const [imageOk, setImageOk] = useState(true);
  if (!video && !(image && imageOk)) return null;

  return (
    <div className="space-y-3">
      {image && imageOk && (
        <img
          src={image}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageOk(false)}
          className="max-h-[60svh] w-full rounded-[14px] border border-app-line bg-app-mint object-contain"
        />
      )}
      {video && (
        <div
          className={`overflow-hidden rounded-[14px] border border-app-line bg-black ${
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
      )}
    </div>
  );
}
