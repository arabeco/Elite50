/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GameProvider, useGame } from './store/GameContext';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { WorldSelector } from './components/WorldSelector';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';
import { supabase } from './lib/supabase';
import { isCapacitorNativeRuntime, isNativeAuthCallbackUrl, parseNativeAuthCallback } from './lib/nativeAuth';

// Ferramenta interna de preview do motor 2D. Era importada estaticamente, entao ela
// e todo o match2DPlayEngine viajavam no bundle inicial de todo jogador, apesar de so
// serem alcancaveis pela rota /match2d-preview.
const Match2DPreview = lazy(() =>
  import('./dev/Match2DPreview').then(module => ({ default: module.Match2DPreview }))
);

function AppContent() {
  const { isAuthenticated, worldId } = useGame();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCapacitorNativeRuntime()) return;

    let removeListener: (() => void) | undefined;

    const setupNativeAuthListener = async () => {
      const [{ App }, { Browser }] = await Promise.all([
        import('@capacitor/app'),
        import('@capacitor/browser'),
      ]);

      const listener = await App.addListener('appUrlOpen', async ({ url }) => {
        if (!isNativeAuthCallbackUrl(url)) return;

        const { code, accessToken, refreshToken, error, errorDescription } = parseNativeAuthCallback(url);
        await Browser.close().catch(() => undefined);

        if (error) {
          console.error('Native auth callback error:', errorDescription || error);
          navigate('/login', { replace: true });
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Native auth exchange error:', exchangeError);
            navigate('/login', { replace: true });
            return;
          }
        } else if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            console.error('Native auth set session error:', sessionError);
            navigate('/login', { replace: true });
            return;
          }
        } else {
          console.error('Native auth callback missing code/session tokens.');
          navigate('/login', { replace: true });
          return;
        }

        navigate('/worlds', { replace: true });
      });

      removeListener = () => {
        listener.remove();
      };
    };

    setupNativeAuthListener().catch(error => {
      console.error('Failed to setup native auth listener:', error);
    });

    return () => {
      removeListener?.();
    };
  }, [navigate]);

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
  if (window.location.pathname === '/match2d-preview') {
    return (
      <ErrorBoundary>
        <Suspense fallback={null}>
          <Match2DPreview />
        </Suspense>
      </ErrorBoundary>
    );
  }

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
