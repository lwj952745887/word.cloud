import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import HostPage from './pages/HostPage';
import AudiencePage from './pages/AudiencePage';
import DisplayPage from './pages/DisplayPage';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/audience/:roomId" element={<AudiencePage />} />
        <Route path="/display/:roomId" element={<DisplayPage />} />
      </Routes>
    </div>
  );
}

export default App;
