import { getVideoEmbedUrl } from '../../../lib/video';

// A gyakorlat médiakerete (16:9). Most csak videót tud; később ide kerülhet a képgaléria is.
export default function ExerciseMedia({ name, videoUrl }: { name: string; videoUrl: string | null }) {
  const embed = getVideoEmbedUrl(videoUrl);
  if (!embed) return null;
  return (
    <div className="aspect-video w-full overflow-hidden rounded-[14px] border border-[#D5DDE6] bg-black">
      {/* A YouTube a beágyazáshoz kér origin-referrert; teljes URL nem megy ki. */}
      <iframe
        src={embed}
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
