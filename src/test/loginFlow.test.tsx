import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Login } from '../components/Login';

const signInWithPasswordMock = vi.hoisted(() => vi.fn());
const signInWithOAuthMock = vi.hoisted(() => vi.fn());
const signUpMock = vi.hoisted(() => vi.fn());
const resetPasswordForEmailMock = vi.hoisted(() => vi.fn());
const addToastMock = vi.hoisted(() => vi.fn());
const setIsAuthenticatedMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signInWithOAuth: signInWithOAuthMock,
      signUp: signUpMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
    },
  },
}));

vi.mock('../store/GameContext', () => ({
  useGameDispatch: () => ({
    addToast: addToastMock,
    setIsAuthenticated: setIsAuthenticatedMock,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

describe('Login flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    signInWithPasswordMock.mockResolvedValue({ error: null });
    signInWithOAuthMock.mockResolvedValue({ error: null });
    signUpMock.mockResolvedValue({ data: { session: null }, error: null });
    resetPasswordForEmailMock.mockResolvedValue({ error: null });
    vi.stubEnv('VITE_SUPABASE_URL', 'https://elite50.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  });

  it('submits email login and calls onLogin', async () => {
    const onLogin = vi.fn();
    render(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText(/voce@email.com/i), { target: { value: 'qa@elite50.local' } });
    fireEvent.change(screen.getByPlaceholderText(/minimo 6 caracteres/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar no Sistema/i }));

    await waitFor(() => {
      expect(signInWithPasswordMock).toHaveBeenCalledWith({
        email: 'qa@elite50.local',
        password: '123456',
      });
      expect(onLogin).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a friendly auth error for invalid credentials', async () => {
    signInWithPasswordMock.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    });

    render(<Login onLogin={() => undefined} />);

    fireEvent.change(screen.getByPlaceholderText(/voce@email.com/i), { target: { value: 'qa@elite50.local' } });
    fireEvent.change(screen.getByPlaceholderText(/minimo 6 caracteres/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Entrar no Sistema/i }));

    expect(await screen.findByText(/Credenciais invalidas/i)).toBeInTheDocument();
  });

  it('sends a password reset when the email is filled', async () => {
    render(<Login onLogin={() => undefined} />);

    fireEvent.change(screen.getByPlaceholderText(/voce@email.com/i), { target: { value: 'qa@elite50.local' } });
    fireEvent.click(screen.getByRole('button', { name: /Recuperar senha/i }));

    await waitFor(() => {
      expect(resetPasswordForEmailMock).toHaveBeenCalled();
      expect(screen.getByText(/Enviamos um link de recuperacao/i)).toBeInTheDocument();
    });
  });
});
