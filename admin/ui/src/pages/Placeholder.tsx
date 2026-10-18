export default function Placeholder({ title, stage }: { title: string; stage: 'B' | 'C' }) {
  return (
    <div className="rounded-[14px] border border-dashed border-line bg-white p-10 text-center">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted">Ez a képernyő a {stage}. szakaszban készül el.</p>
    </div>
  );
}
