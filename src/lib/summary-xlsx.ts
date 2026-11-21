// Az összesítő táblázat Excel-fájlként (hetek oszlopokban, gyakorlatok sorokban, színezett progresszió).
// A write-excel-file csomag csak letöltéskor töltődik be, így az app indulását nem lassítja.
import type { PlanSummary } from './plan-summary';

const GREEN = '#d1fae5';
const RED = '#fee2e2';
const DAY_FILL = '#e6f4f1';
const NAVY = '#10294a';

export async function summaryToXlsx(summary: PlanSummary, title: string, subtitle?: string): Promise<Blob> {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const width = summary.weeks.length + 2;
  const pad = (n: number) => Array.from({ length: n }, () => null);

  const data: unknown[][] = [];
  data.push([{ value: title, fontWeight: 'bold', fontSize: 14, textColor: NAVY, columnSpan: width }, ...pad(width - 1)]);
  if (subtitle) data.push([{ value: subtitle, textColor: '#5b6b80', columnSpan: width }, ...pad(width - 1)]);
  data.push([
    { value: 'Gyakorlat', fontWeight: 'bold', textColor: '#ffffff', backgroundColor: NAVY },
    ...summary.weeks.map((w) => ({
      value: `${w}. hét`,
      fontWeight: 'bold',
      textColor: '#ffffff',
      backgroundColor: NAVY,
      align: 'center',
    })),
    { value: 'Változás', fontWeight: 'bold', textColor: '#ffffff', backgroundColor: NAVY, align: 'center' },
  ]);
  const headerRows = data.length;

  for (const g of summary.days) {
    data.push([
      { value: g.title, fontWeight: 'bold', backgroundColor: DAY_FILL, textColor: NAVY, columnSpan: width },
      ...pad(width - 1),
    ]);
    for (const row of g.rows) {
      data.push([
        { value: row.exerciseName, wrap: true, alignVertical: 'top' },
        ...summary.weeks.map((w) => {
          const c = row.cells.get(w);
          if (!c) return { value: '', backgroundColor: '#f4f6f9' };
          if (!c.text) return { value: c.prescribed, textColor: '#9aa5b4', wrap: true, align: 'center', alignVertical: 'top' };
          return {
            value: c.text,
            wrap: true,
            align: 'center',
            alignVertical: 'top',
            backgroundColor: c.trend === 'up' ? GREEN : c.trend === 'down' ? RED : undefined,
          };
        }),
        {
          value: row.change,
          align: 'center',
          alignVertical: 'top',
          fontWeight: 'bold',
          textColor: row.change.startsWith('+') ? '#047857' : row.change.startsWith('−') ? '#b91c1c' : '#5b6b80',
        },
      ]);
    }
  }

  data.push([
    {
      value: 'Zöld: több, mint az előző naplózott héten · piros: kevesebb · szürke: előírás (még nincs napló)',
      textColor: '#5b6b80',
      fontSize: 9,
      columnSpan: width,
    },
    ...pad(width - 1),
  ]);

  const columns = [{ width: 30 }, ...summary.weeks.map(() => ({ width: 18 })), { width: 11 }];
  // A csomag típusai szigorúak a cellákra; a fenti szerkezet megfelel a dokumentált formának.
  return (writeExcelFile as unknown as (d: unknown, o: unknown) => { toBlob: () => Promise<Blob> })(data, {
    columns,
    sheet: 'Összesítő',
    stickyRowsCount: headerRows,
    stickyColumnsCount: 1,
    orientation: 'landscape',
    fontFamily: 'Arial',
    fontSize: 10,
  }).toBlob();
}

/** Fájlnévbe illő szöveg: ékezetek nélkül, kötőjelekkel. */
export function fileSlug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 50);
}

/**
 * Megosztás a telefon saját menüjével (Gmail, WhatsApp, mentés…), ha a böngésző tud fájlt megosztani;
 * különben sima letöltés. Visszaadja, melyik történt.
 */
export async function shareOrDownload(blob: Blob, fileName: string, text: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: blob.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: fileName, text });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
      // ha a megosztás nem sikerül, letöltünk
    }
  }
  downloadBlob(blob, fileName);
  return 'downloaded';
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
