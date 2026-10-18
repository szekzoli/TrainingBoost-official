import { Fragment, useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Printer } from 'lucide-react';
import type { PlanDay } from '../../lib/app-api';
import { useSession } from '../components/app/session';
import { groupExercises, isSuperset } from '../components/app/plan-utils';

// Nyomtatási nézet: a böngésző "Nyomtatás / Mentés PDF-ként" funkciója alakítja PDF-fé (nincs PDF-könyvtár).
// A stílusok ide tartoznak és a pp- előtaggal vannak elkülönítve; a komponens csak a /app/print/:week útvonalon él.
const PRINT_CSS = `
@page { size: A4; margin: 0; }
.pp-wrap { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pp-page { box-sizing: border-box; width: 210mm; min-height: 296mm; padding: 44px 48px; display: flex; flex-direction: column; background: #fff; color: #10294A; font-size: 12px; line-height: 1.35; }
.pp-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #7B8A9A; padding-bottom: 10px; }
.pp-brand { font-size: 18px; font-weight: 700; }
.pp-brand span { color: #0B7566; }
.pp-site { color: #3F4F61; font-size: 12px; }
.pp-title { margin: 16px 0 0; font-size: 26px; font-weight: 700; line-height: 1.15; }
.pp-sub { margin: 4px 0 0; color: #3F4F61; font-size: 13px; }
.pp-fill { display: flex; gap: 28px; margin-top: 14px; color: #3F4F61; }
.pp-line { display: inline-block; width: 120px; border-bottom: 1px solid #3F4F61; margin-left: 6px; }
.pp-help { margin: 8px 0 0; color: #3F4F61; }
.pp-table { width: 100%; margin-top: 12px; border-collapse: collapse; table-layout: fixed; }
.pp-table thead { display: table-header-group; }
.pp-table th { padding: 6px 6px; border: 1px solid #7B8A9A; border-bottom: 1.5px solid #10294A; text-align: left; font-size: 12px; font-weight: 700; }
.pp-table td { padding: 6px 6px; border: 1px solid #7B8A9A; vertical-align: top; overflow-wrap: anywhere; }
.pp-table tr { break-inside: avoid; page-break-inside: avoid; }
.pp-table .pp-in { height: 38px; }
.pp-table .pp-na { background: repeating-linear-gradient(135deg, #fff 0 4px, #B4BFCB 4px 5px); }
.pp-table .pp-c { text-align: center; }
.pp-section td { background: #E9EDF1; padding: 5px 6px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; font-size: 12px; }
.pp-section .pp-sec-in { display: flex; justify-content: space-between; gap: 12px; }
.pp-section .pp-sec-ss { text-transform: none; letter-spacing: 0; font-weight: 600; color: #0B7566; text-align: right; }
.pp-ss td:first-child { border-left: 4px solid #0B7566; }
.pp-mark { display: inline-block; min-width: 22px; margin-right: 6px; padding: 0 3px; border: 1px solid #0B7566; border-radius: 4px; color: #0B7566; font-weight: 700; text-align: center; }
.pp-name { font-weight: 600; }
.pp-note { margin-top: 2px; color: #3F4F61; font-size: 12px; }
.pp-notebox { margin-top: 14px; }
.pp-notebox b { display: block; margin-bottom: 4px; }
.pp-notebox div { height: 76px; border: 1px solid #7B8A9A; }
.pp-foot { display: flex; justify-content: space-between; margin-top: auto; padding-top: 16px; color: #3F4F61; font-size: 12px; }
@media screen {
  .pp-wrap { background: #F4F6F9; padding: 16px; overflow-x: auto; }
  .pp-page { margin: 0 auto 16px; box-shadow: 0 1px 6px rgba(16, 41, 74, .18); }
}
@media print {
  html, body { background: #fff !important; }
  .pp-toolbar, [data-sonner-toaster] { display: none !important; }
  .pp-wrap { padding: 0; background: #fff; overflow: visible; }
  .pp-page { margin: 0; box-shadow: none; break-after: page; page-break-after: always; }
  .pp-page:last-child { break-after: auto; page-break-after: auto; }
}
`;

function PrintPage({
  day,
  planTitle,
  index,
  total,
}: {
  day: PlanDay;
  planTitle: string;
  index: number;
  total: number;
}) {
  const title = day.title ?? `${day.day}. edzés`;
  const sections = groupExercises(day.exercises);
  const maxSets = day.exercises.reduce((m, e) => Math.max(m, e.sets), 0);
  const cols = Math.min(5, Math.max(3, maxSets));
  // Gyakorlat | Sor. | Ismétlés | Ellenállás | 1..cols
  const inputWidth = 40 / cols;

  return (
    <section className="pp-page" aria-label={title}>
      <div className="pp-head">
        <span className="pp-brand">
          Training<span>Boost</span>
        </span>
        <span className="pp-site">trainingboost.hu</span>
      </div>
      <h1 className="pp-title">{title}</h1>
      <p className="pp-sub">
        {planTitle} · {day.week}. hét
      </p>
      <div className="pp-fill">
        <span>
          Hét:<span className="pp-line" />
        </span>
        <span>
          Dátum:<span className="pp-line" />
        </span>
      </div>
      <p className="pp-help">Írd a mezőkbe a valós értéket: kg × ismétlés.</p>

      <table className="pp-table">
        <colgroup>
          <col style={{ width: '27%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '14%' }} />
          {Array.from({ length: cols }, (_, i) => (
            <col key={i} style={{ width: `${inputWidth}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th>Gyakorlat</th>
            <th>Sor.</th>
            <th>Ismétlés</th>
            <th>Ellenállás</th>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i} className="pp-c">
                {i + 1}.
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((sec, si) => {
            const ssText = sec.blocks
              .filter(isSuperset)
              .map(
                (b) =>
                  `${b.items.map((_, i) => `${b.label}${i + 1}`).join(' + ')}: szuperszett, szünet nélkül`,
              )
              .join(' · ');
            return (
              <Fragment key={`${sec.name}-${si}`}>
                {(sec.name || ssText) && (
                  <tr className="pp-section">
                    <td colSpan={4 + cols}>
                      <div className="pp-sec-in">
                        <span>{sec.name}</span>
                        {ssText && <span className="pp-sec-ss">{ssText}</span>}
                      </div>
                    </td>
                  </tr>
                )}
                {sec.blocks.flatMap((block) =>
                  block.items.map((it, i) => {
                    const ss = isSuperset(block);
                    return (
                      <tr key={it.id} className={ss ? 'pp-ss' : undefined}>
                        <td>
                          <div className="pp-name">
                            {ss && <span className="pp-mark">{`${block.label}${i + 1}`}</span>}
                            {it.exercise.name}
                          </div>
                          {it.note?.trim() && <div className="pp-note">{it.note.trim()}</div>}
                        </td>
                        <td className="pp-c">{it.sets}</td>
                        <td>{it.reps}</td>
                        <td>{it.resistance?.trim() || '–'}</td>
                        {Array.from({ length: cols }, (_, c) => (
                          <td key={c} className={c < it.sets ? 'pp-in' : 'pp-in pp-na'} />
                        ))}
                      </tr>
                    );
                  }),
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <div className="pp-notebox">
        <b>Jegyzet</b>
        <div />
      </div>

      <div className="pp-foot">
        <span>TrainingBoost · {title}</span>
        <span>
          {index} / {total}
        </span>
      </div>
    </section>
  );
}

export default function AppPrint() {
  const { week } = useParams();
  const { plan } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const days = (plan?.days.filter((d) => String(d.week) === week) ?? []).sort((a, b) => a.day - b.day);

  // A PDF fájlnevét a dokumentum címe adja
  useEffect(() => {
    if (!plan) return;
    const prev = document.title;
    document.title = `TrainingBoost – ${week}. hét`;
    return () => {
      document.title = prev;
    };
  }, [plan, week]);

  // Ha az alkalmazáson belülről jöttünk (hét vagy edzésnap nézet), oda lépünk vissza
  const back = () => (location.key !== 'default' ? navigate(-1) : navigate(`/app/w/${week}`));

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div className="pp-toolbar sticky top-0 z-10 border-b border-[#D5DDE6] bg-white">
        <div className="mx-auto flex min-h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <button
            type="button"
            onClick={back}
            className="inline-flex min-h-11 items-center pr-3 text-sm text-app-navy/70"
          >
            <ChevronLeft className="size-4" /> Vissza
          </button>
          {days.length > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center gap-2 rounded-[12px] bg-app-teal px-4 text-sm font-semibold text-white"
            >
              <Printer className="size-4" /> Nyomtatás / Mentés PDF-ként
            </button>
          )}
        </div>
      </div>

      {plan && days.length > 0 ? (
        <div className="pp-wrap">
          {days.map((d, i) => (
            <PrintPage key={d.id} day={d} planTitle={plan.plan.title} index={i + 1} total={days.length} />
          ))}
        </div>
      ) : (
        <div className="mx-auto max-w-md space-y-4 px-4 py-6">
          <p className="text-sm text-app-navy/70">Ehhez a héthez nincs edzés.</p>
          <Link to="/app" className="text-sm font-semibold text-app-teal underline">
            Vissza a tervhez
          </Link>
        </div>
      )}
    </>
  );
}
