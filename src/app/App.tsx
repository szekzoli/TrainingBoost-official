import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import MorningBoost from './pages/MorningBoost';
import PersonalTraining from './pages/PersonalTraining';
// import OnlinePrograms from './pages/OnlinePrograms';
import OutdoorTraining from './pages/OutdoorTraining';
import Contact from './pages/Contact';

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
      </Routes>
    </BrowserRouter>
  );
}