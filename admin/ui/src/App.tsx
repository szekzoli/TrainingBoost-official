import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { api, type Status } from './api';
import Exercises from './pages/Exercises';
import Clients from './pages/Clients';
import PlanEditor from './pages/PlanEditor';
import Plans from './pages/Plans';

const NAV = [
  { to: '/tervek', label: 'Tervek' },
  { to: '/sablonok', label: 'Sablonok' },
  { to: '/gyakorlattar', label: 'Gyakorlattár' },
  { to: '/ugyfelek', label: 'Ügyfelek' },
];

function SetupNotice({ problems }: { problems: string[] }) {
  return (
    <div className="mx-auto max-w-2xl rounded-[14px] border border-line bg-white p-6">
      <h1 className="text-xl font-bold">Az admin még nincs beállítva</h1>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        {problems.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted">
        <li>
          Másold az <code>admin/.env.example</code> fájlt <code>admin/.env.local</code> néven.
        </li>
        <li>
          Töltsd ki a <code>SUPABASE_URL</code> és a <code>SUPABASE_SECRET_KEY</code> értékét (Supabase → Project Settings → API Keys →
          secret key).
        </li>
        <li>Indítsd újra az `npm run admin` parancsot.</li>
      </ol>
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<Status | 'loading' | 'unreachable'>('loading');

  useEffect(() => {
    api
      .status()
      .then(setStatus)
      .catch(() => setStatus('unreachable'));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white print:hidden">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-8 px-6">
          <span className="text-base font-bold tracking-tight">
            Training<span className="text-teal">Boost</span>
            <span className="ml-2 text-xs font-semibold uppercase tracking-wider text-muted">admin</span>
          </span>
          <nav className="flex h-full items-stretch gap-1" aria-label="Fő navigáció">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `flex items-center border-b-2 px-4 text-sm font-semibold ${
                    isActive ? 'border-teal text-teal' : 'border-transparent text-muted hover:text-navy'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {status === 'loading' ? (
          <p className="text-sm text-muted">Betöltés…</p>
        ) : status === 'unreachable' ? (
          <SetupNotice problems={['A helyi szerver nem érhető el. Fut az `npm run admin`?']} />
        ) : !status.configured ? (
          <SetupNotice problems={status.problems} />
        ) : (
          <Routes>
            <Route path="/" element={<Navigate to="/tervek" replace />} />
            <Route path="/tervek" element={<Plans key="plans" templates={false} />} />
            <Route path="/sablonok" element={<Plans key="templates" templates />} />
            <Route path="/terv/:id" element={<PlanEditor />} />
            <Route path="/gyakorlattar" element={<Exercises />} />
            <Route path="/ugyfelek" element={<Clients />} />
            <Route path="*" element={<Navigate to="/tervek" replace />} />
          </Routes>
        )}
      </main>
    </div>
  );
}
