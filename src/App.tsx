/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider, useGame } from './store/GameContext';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { WorldSelector } from './components/WorldSelector';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';

function AppContent() {
  const { isAuthenticated, worldId } = useGame();

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login onLogin={() => { }} /> : <Navigate to={worldId ? "/dashboard" : "/worlds"} replace />}
        />
        <Route
          path="/worlds"
          element={isAuthenticated ? (!worldId ? <WorldSelector /> : <Navigate to="/dashboard" replace />) : <Navigate to="/login" replace />}
        />
        <Route
          path="/dashboard/*"
          element={isAuthenticated && worldId ? <Dashboard /> : <Navigate to={!isAuthenticated ? "/login" : "/worlds"} replace />}
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <GameProvider>
          <AppContent />
        </GameProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
