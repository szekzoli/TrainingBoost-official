import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { useSession } from '../components/app/session';

export default function AppSettings() {
  const { deleteMyData } = useSession();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await deleteMyData();
    } catch {
      toast.error('A törlés nem sikerült. Próbáld újra.');
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/app" className="inline-flex items-center text-sm text-app-navy/70">
        <ChevronLeft className="size-4" /> Vissza
      </Link>
      <h1 className="text-2xl font-bold">Beállítások</h1>

      <section className="space-y-2 border border-app-navy/15 p-4">
        <h2 className="font-semibold">Adatkezelés</h2>
        <p className="text-sm leading-relaxed text-app-navy/80">
          Az edzésnaplódat (súlyok, ismétlések, jegyzetek) kizárólag a te edzéseid követésére tároljuk,
          az Európai Unión belül. A hozzájárulásodat bármikor visszavonhatod az adataid törlésével.
        </p>
      </section>

      <section className="space-y-3 border border-app-navy/15 p-4">
        <h2 className="font-semibold">Adataim törlése</h2>
        <p className="text-sm leading-relaxed text-app-navy/80">
          Végleg törli az összes naplóadatodat és a hozzáférésedet is. Ez nem visszavonható.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              disabled={busy}
              className="h-12 w-full rounded-lg border border-red-700 text-base font-semibold text-red-700 disabled:opacity-50"
            >
              Adataim törlése
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Biztosan törlöd az adataidat?</AlertDialogTitle>
              <AlertDialogDescription>
                Minden naplózott edzésed és a hozzáférésed is megszűnik, a linked nem fog működni.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Mégsem</AlertDialogCancel>
              <AlertDialogAction onClick={remove}>Igen, törlöm</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
