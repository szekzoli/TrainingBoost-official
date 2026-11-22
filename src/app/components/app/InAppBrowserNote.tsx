// Ha a link egy közösségi app (pl. Instagram, Messenger) beépített böngészőjében nyílt meg:
// innen nem lehet a főképernyőhöz adni, ezért elmagyarázzuk, hogyan nyissa meg Safariban / Chrome-ban.
import { useState } from 'react';
import { inAppBrowser, isIos } from './install-prompt';

export function InAppBrowserNote({ link }: { link: string }) {
  const app = inAppBrowser();
  const [copied, setCopied] = useState(false);
  if (!app) return null;
  const browser = isIos() ? 'Safari' : 'Chrome';
  // Névelő: magánhangzóval kezdődő név előtt „az”, különben „a”
  const art = (w: string) => (/^[aáeéiíoóöőuúüű]/i.test(w) ? 'az' : 'a');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ha a másolás nem megy, a link alább kijelölhető */
    }
  };

  return (
    <div className="space-y-2 rounded-[10px] border border-app-line bg-white p-3 text-sm leading-relaxed text-app-navy">
      <p>
        <strong>
          Most {art(app)} {app} beépített böngészőjében vagy.
        </strong> Innen nem lehet a főképernyőhöz adni. Nyisd meg a
        linket {art(browser)} {browser} böngészőben:
      </p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>
          Koppints a jobb felső sarokban a <strong>•••</strong> (vagy ⋮) gombra, és válaszd a{' '}
          <strong>Megnyitás a böngészőben</strong> (Open in external browser / Open in {browser}) lehetőséget.
        </li>
        <li>
          Ha ilyen nincs: másold ki a linket, nyisd meg {art(browser)} {browser} böngészőt, és illeszd be a címsorba.
        </li>
      </ol>
      <button
        type="button"
        onClick={() => void copy()}
        className="h-11 w-full rounded-lg border border-app-teal text-sm font-semibold text-app-teal"
      >
        {copied ? 'Kimásolva' : 'Link másolása'}
      </button>
    </div>
  );
}
