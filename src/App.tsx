import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GameProvider } from '@/context/GameContext.tsx';
import Home from '@/pages/Home';
import Room from '@/pages/Room';
import NotFound from '@/pages/NotFound';
import './App.css';

export default function App() {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </GameProvider>
  );
} 