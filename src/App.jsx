import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import MapPage from './pages/Map';
import AlertsPage from './pages/Alerts';
import ChatPage from './pages/Chat';
import PitchPage from './pages/Pitch';
import ForecastPage from './pages/Forecast';
import RewardsPage from './pages/Rewards';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/pitch" element={<PitchPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="map" element={<MapPage />} />
          <Route path="forecast" element={<ForecastPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="chat" element={<ChatPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
