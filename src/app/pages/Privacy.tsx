import { OPERATOR, PRIVACY_UPDATED } from '../../lib/site-info';
import { openConsentSettings } from '../../lib/consent';

// Adatkezelési tájékoztató és impresszum. Az üzemeltető adatai a src/lib/site-info.ts fájlban vannak.

function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-12 scroll-mt-24 font-display text-2xl font-bold text-foreground">
      {children}
    </h2>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
      <dt className="font-semibold text-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

const link = 'font-medium text-foreground underline underline-offset-4';

export default function Privacy() {
  const o = OPERATOR;
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground md:py-20 [&_p]:mt-3 [&_p]:leading-relaxed">
      <p className="text-sm font-semibold uppercase tracking-wider text-accent">Jogi információk</p>
      <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-foreground md:text-5xl">
        Adatkezelési tájékoztató
      </h1>
      <p>Hatályos: {PRIVACY_UPDATED}</p>
      <p>
        Ebben a tájékoztatóban leírom, milyen személyes adatokat kezelek, amikor felkeresed a weboldalt, jelentkezel egy
        edzésre, üzenetet küldesz, vagy az edzésterv-követő alkalmazást használod, és milyen jogaid vannak ezekkel
        kapcsolatban. Az adatkezelés az Európai Unió általános adatvédelmi rendelete (GDPR) és az információs
        önrendelkezési jogról szóló 2011. évi CXII. törvény szerint történik.
      </p>

      <H2>1. Az adatkezelő</H2>
      <dl className="mt-4">
        <Row label="Név">{o.name}</Row>
        {o.address && <Row label="Cím">{o.address}</Row>}
        <Row label="E-mail">
          <a href={`mailto:${o.email}`} className={link}>
            {o.email}
          </a>
        </Row>
        <Row label="Telefon">
          <a href={o.phoneHref} className={link}>
            {o.phone}
          </a>
        </Row>
      </dl>

      <H2>2. Jelentkezés, kapcsolatfelvétel</H2>
      <p>
        A Morning Boost, a személyi edzés, a kültéri edzés és a Kapcsolat oldal űrlapján, valamint e-mailben vagy
        telefonon megadott adataidat azért kezelem, hogy válaszolni tudjak, és megszervezzük az edzést.
      </p>
      <dl className="mt-4">
        <Row label="Kezelt adatok">
          név, e-mail-cím, telefonszám (nem kötelező), az üzenet szövege, a választott edzésalkalom
        </Row>
        <Row label="Cél">a megkeresés megválaszolása, a jelentkezés (automatikus e-mailes) visszaigazolása és az edzés megszervezése</Row>
        <Row label="Jogalap">
          a szerződés megkötését megelőző, a kérésedre tett lépések (GDPR 6. cikk (1) b) pont)
        </Row>
        <Row label="Megőrzés">
          a megkeresés lezárását követő 1 évig; ha közös edzés lesz belőle, az együttműködés végét követő 1 évig, vagy
          korábban, ha kéred a törlést
        </Row>
        <Row label="Adatfeldolgozók">
          Netlify, Inc. (az űrlap fogadása és a weboldal tárhelye, USA; az EU általános szerződési feltételei alapján);
          Google Ireland Ltd. (e-mail-fiók, amelybe az értesítés érkezik); Resend, Inc. (az automatikus visszaigazoló
          e-mail kiküldése, USA; az EU általános szerződési feltételei alapján)
        </Row>
      </dl>
      <p>
        <strong className="text-foreground">Egészséggel kapcsolatos információ.</strong> Ha az üzenetben önként
        megírod, hogy van-e sérülésed vagy panaszod, azt kizárólag az edzés biztonságos megtervezéséhez használom, a
        kifejezett hozzájárulásod alapján (GDPR 9. cikk (2) a) pont). Ezt a hozzájárulást bármikor visszavonhatod egy
        e-maillel; ilyenkor az erre vonatkozó részt törlöm.
      </p>

      <H2 id="sutik">3. Sütik és látogatottságmérés</H2>
      <p>
        Az oldal működéséhez saját sütit nem használok. A látogatottságmérés (Google Analytics) csak akkor indul el,
        ha a megjelenő sávon az <strong className="text-foreground">Elfogadom</strong> gombot választod.
      </p>
      <dl className="mt-4">
        <Row label="Szolgáltatás">Google Analytics 4 (Google Ireland Ltd.)</Row>
        <Row label="Kezelt adatok">
          a meglátogatott oldalak, a látogatás ideje, az eszköz és a böngésző típusa, hozzávetőleges földrajzi hely (az
          IP-címet a Google nem tárolja)
        </Row>
        <Row label="Sütik">_ga, _ga_&lt;azonosító&gt;, legfeljebb 2 évig</Row>
        <Row label="Cél">összesített statisztika arról, mely oldalakat nézik, hogy az oldalt fejleszteni tudjam</Row>
        <Row label="Jogalap">a hozzájárulásod (GDPR 6. cikk (1) a) pont)</Row>
        <Row label="Megőrzés">a Google Analytics adatmegőrzési beállítása szerint, legfeljebb 14 hónapig</Row>
      </dl>
      <p>
        A döntésedet bármikor megváltoztathatod:{' '}
        <button type="button" onClick={openConsentSettings} className={link}>
          Süti-beállítások
        </button>
        . A hozzájárulás visszavonása nem érinti a korábbi mérés jogszerűségét.
      </p>
      <p>
        <strong className="text-foreground">Beágyazott tartalmak.</strong> Egyes oldalakon a Google Térkép és az
        Instagram tartalma jelenik meg. Ezeket a szolgáltatók saját oldalukról töltik be, és saját adatkezelési
        szabályaik szerint sütiket helyezhetnek el (
        <a href="https://policies.google.com/privacy?hl=hu" target="_blank" rel="noreferrer" className={link}>
          Google
        </a>
        ,{' '}
        <a href="https://privacycenter.instagram.com/policy" target="_blank" rel="noreferrer" className={link}>
          Instagram
        </a>
        ).
      </p>

      <H2>4. Edzésterv-követő alkalmazás</H2>
      <p>
        Az ügyfeleimnek személyes linket adok az edzéstervük követéséhez. Az alkalmazás az első adatrögzítés előtt
        külön tájékoztatást ad és hozzájárulást kér.
      </p>
      <dl className="mt-4">
        <Row label="Kezelt adatok">
          egy azonosító (név helyett monogram), az edzésterv, a rögzített súlyok és ismétlések, az edzések dátuma,
          értékelése és jegyzetei
        </Row>
        <Row label="Cél">az edzésterv és a haladás követése</Row>
        <Row label="Jogalap">a hozzájárulásod (GDPR 6. cikk (1) a) pont)</Row>
        <Row label="Megőrzés">
          az együttműködés végéig, illetve amíg az alkalmazásban a „Saját adatok törlése” funkcióval nem törlöd
        </Row>
        <Row label="Adatfeldolgozó">Supabase, Inc.; az adatok az Európai Unióban (Frankfurt) tárolódnak</Row>
      </dl>

      <H2>5. Az adatok biztonsága</H2>
      <p>
        Az adatokat csak én látom; harmadik félnek nem adom át, és nem használom reklámcélra. A weboldal és az
        alkalmazás titkosított (HTTPS) kapcsolaton keresztül érhető el.
      </p>

      <H2>6. A jogaid</H2>
      <p>
        Kérheted, hogy tájékoztassalak a rólad kezelt adatokról, és megkaphasd azok másolatát; kérheted az adatok
        helyesbítését, törlését vagy kezelésük korlátozását; tiltakozhatsz a kezelésük ellen; kérheted, hogy géppel
        olvasható formában átadjam őket; és a hozzájárulásodat bármikor visszavonhatod. Ehhez írj a{' '}
        <a href={`mailto:${o.email}`} className={link}>
          {o.email}
        </a>{' '}
        címre, és legkésőbb egy hónapon belül válaszolok.
      </p>
      <p>
        Ha úgy érzed, hogy az adataidat nem megfelelően kezelem, panasszal fordulhatsz a Nemzeti Adatvédelmi és
        Információszabadság Hatósághoz (NAIH, 1055 Budapest, Falk Miksa utca 9–11.,{' '}
        <a href="https://naih.hu" target="_blank" rel="noreferrer" className={link}>
          naih.hu
        </a>
        , ugyfelszolgalat@naih.hu), vagy bírósághoz fordulhatsz. Kérlek, előbb keress meg engem, a legtöbb kérdést
        gyorsan meg tudjuk oldani.
      </p>

      <H2 id="impresszum">Impresszum</H2>
      <dl className="mt-4">
        <Row label="Üzemeltető">{o.name}</Row>
        {o.address && <Row label="Cím">{o.address}</Row>}
        {o.taxNumber && <Row label="Adószám">{o.taxNumber}</Row>}
        {o.registrationNumber && <Row label="Nyilvántartási szám">{o.registrationNumber}</Row>}
        <Row label="Kapcsolat">
          <a href={`mailto:${o.email}`} className={link}>
            {o.email}
          </a>{' '}
          ·{' '}
          <a href={o.phoneHref} className={link}>
            {o.phone}
          </a>
        </Row>
        <Row label="Tárhelyszolgáltató">
          Netlify, Inc., 101 2nd Street, San Francisco, CA 94105, USA · privacy@netlify.com
        </Row>
      </dl>
    </article>
  );
}
