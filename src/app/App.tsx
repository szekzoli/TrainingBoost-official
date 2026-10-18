import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import MorningBoost from './pages/MorningBoost';
import PersonalTraining from './pages/PersonalTraining';
// import OnlinePrograms from './pages/OnlinePrograms';
import OutdoorTraining from './pages/OutdoorTraining';
import Contact from './pages/Contact';

// Az edzésnapló (/app) külön csomagba kerül, hogy a nyilvános oldalt ne nehezítse.
const AppShell = lazy(() => import('./components/app/AppShell'));
const AppHome = lazy(() => import('./pages/AppHome'));
const AppWeek = lazy(() => import('./pages/AppWeek'));
const AppDay = lazy(() => import('./pages/AppDay'));
const AppExercise = lazy(() => import('./pages/AppExercise'));
const AppPrint = lazy(() => import('./pages/AppPrint'));
const AppSettings = lazy(() => import('./pages/AppSettings'));

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/morning-boost" element={<Layout><MorningBoost /></Layout>} />
        <Route path="/personal-training" element={<Layout><PersonalTraining /></Layout>} />
        {/* <Route path="/online-programs" element={<Layout><OnlinePrograms /></Layout>} /> */}
        <Route path="/outdoor-training" element={<Layout><OutdoorTraining /></Layout>} />
        <Route path="/contact" element={<Layout><Contact /></Layout>} />
        <Route
          path="/app"
          element={<Suspense fallback={null}><AppShell /></Suspense>}
        >
          <Route index element={<Suspense fallback={null}><AppHome /></Suspense>} />
          {/* belépő link: a kódot a SessionProvider veszi át és az URL-t /app-ra cseréli */}
          <Route path="t/:code" element={null} />
          <Route path="w/:week" element={<Suspense fallback={null}><AppWeek /></Suspense>} />
          <Route path="d/:week/:day" element={<Suspense fallback={null}><AppDay /></Suspense>} />
          <Route path="e/:week/:day/:dayExerciseId" element={<Suspense fallback={null}><AppExercise /></Suspense>} />
          <Route path="print/:week" element={<Suspense fallback={null}><AppPrint /></Suspense>} />
          <Route path="settings"element={<Suspense fallback={null}><AppSettings /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}