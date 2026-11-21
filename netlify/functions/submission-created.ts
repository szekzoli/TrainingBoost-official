// Automatikus visszaigazoló e-mail a jelentkezőnek.
//
// A Netlify ezt a függvényt magától futtatja minden ellenőrzött (nem spam) űrlapbeküldés után
// (a fájlnév kötelezően "submission-created"). A levelet a Resend küldi.
//
// Szükséges környezeti változók (Netlify → Project configuration → Environment variables):
//   RESEND_API_KEY  – a Resend API-kulcsa (titkos!)
//   MAIL_FROM       – feladó, pl. "Székely Zoli <jelentkezes@trainingboost.hu>" (a domain legyen hitelesítve a Resendben)
//   MAIL_REPLY_TO   – ide érkezik, ha a jelentkező válaszol (alapból a saját Gmail-cím)
// Ha a RESEND_API_KEY hiányzik, a függvény nem küld semmit (a jelentkezés ettől még rendben beérkezik).

type Submission = {
  form_name?: string;
  data?: Record<string, unknown>;
};

const DEFAULT_REPLY_TO = 'szekely.zoltan92@gmail.com';
const SIGNATURE = 'Üdv,\nZoli\n\nSzékely Zoli · Training Boost\n+36 30 563 0283 · trainingboost.hu';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildEmail(type: string, slot: string): { subject: string; text: string } {
  switch (type) {
    case 'morning-boost':
      return {
        subject: 'Megkaptam a jelentkezésed – Morning Boost',
        text: [
          'Szia!',
          '',
          'Köszönöm, hogy jelentkeztél a Morning Boostra' + (slot ? ` erre az alkalomra: ${slot}.` : '.'),
          'Hamarosan írok a részletekkel és a belépéshez szükséges QR-kóddal.',
          '',
          'Jó tudni:',
          '• Helyszín: Black Door Fitness, 2600 Vác, Szent László út 34. (ingyenes parkolás)',
          '• Hozz kényelmes sportruhát, folyadékot és törölközőt. Edzés után zuhanyozni is tudsz.',
          '• Ha most jössz először: az első alkalom féláron, 2 000 Ft. A díjat a helyszínen nálam tudod rendezni.',
          '',
          'Ha mégsem tudsz jönni, vagy kérdésed van, csak válaszolj erre a levélre.',
          '',
          SIGNATURE,
        ].join('\n'),
      };
    case 'personal-training':
      return {
        subject: 'Megkaptam az üzeneted – személyi edzés',
        text: [
          'Szia!',
          '',
          'Köszönöm, hogy megkerestél a személyi edzéssel vagy az edzéstervvel kapcsolatban.',
          'Hamarosan jelentkezem, hogy átbeszéljük a céljaidat, és egyeztessünk egy időpontot.',
          '',
          'Ha közben eszedbe jut még valami, csak válaszolj erre a levélre.',
          '',
          SIGNATURE,
        ].join('\n'),
      };
    case 'outdoor-training':
      return {
        subject: 'Megkaptam az érdeklődésed – Outdoor Boost',
        text: [
          'Szia!',
          '',
          'Köszönöm az érdeklődésed a kültéri edzés iránt. Az Outdoor Boost jelenleg szünetel,',
          'de felírtalak, és értesítelek, amint újraindul.',
          '',
          'Addig is szeretettel várlak a Morning Boost reggeli edzésein Vácon: trainingboost.hu/morning-boost',
          '',
          SIGNATURE,
        ].join('\n'),
      };
    default:
      return {
        subject: 'Megkaptam az üzeneted – Training Boost',
        text: [
          'Szia!',
          '',
          'Köszönöm az üzeneted, megkaptam. Hamarosan válaszolok.',
          '',
          SIGNATURE,
        ].join('\n'),
      };
  }
}

function toHtml(text: string): string {
  const body = escapeHtml(text)
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!doctype html><html lang="hu"><body style="margin:0;padding:24px;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#10294a;font-size:15px;line-height:1.5"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">${body}</div></body></html>`;
}

export const handler = async (event: { body?: string | null }) => {
  try {
    const { payload } = JSON.parse(event.body || '{}') as { payload?: Submission };
    const data = payload?.data ?? {};
    if (payload?.form_name !== 'apply') return { statusCode: 200, body: 'skip: form' };
    if (str(data['bot-field'])) return { statusCode: 200, body: 'skip: bot' };

    const to = str(data.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 254) return { statusCode: 200, body: 'skip: email' };

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY nincs beállítva, nem küldök visszaigazolást.');
      return { statusCode: 200, body: 'skip: no key' };
    }

    const { subject, text } = buildEmail(str(data.type), str(data.slot).slice(0, 120));
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'Székely Zoli <jelentkezes@trainingboost.hu>',
        to: [to],
        reply_to: process.env.MAIL_REPLY_TO || DEFAULT_REPLY_TO,
        subject,
        text,
        html: toHtml(text),
      }),
    });
    if (!res.ok) {
      console.error('Resend hiba', res.status, (await res.text()).slice(0, 300));
      return { statusCode: 200, body: 'send failed' };
    }
    return { statusCode: 200, body: 'sent' };
  } catch (err) {
    console.error('Visszaigazoló e-mail hiba', err);
    // A jelentkezés a hibától függetlenül rendben beérkezett; itt nincs mit újrapróbálni.
    return { statusCode: 200, body: 'error' };
  }
};
