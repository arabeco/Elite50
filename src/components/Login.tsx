import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ChevronRight, Chrome, Cpu, Globe, Lock, Mail, Zap } from 'lucide-react';
import { TeamLogo } from './TeamLogo';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: () => void;
}

type AuthMode = 'sign-in' | 'sign-up';

const getAuthErrorMessage = (err: any) => {
  const message = err?.message || '';

  if (message.includes('Failed to fetch') || err?.name === 'TypeError' || message.includes('network')) {
    return 'Erro de conexao: nao foi possivel alcancar o Supabase.';
  }

  if (message.includes('Invalid login credentials')) {
    return 'Credenciais invalidas. Verifique o e-mail e a senha.';
  }

  if (message.includes('User already registered')) {
    return 'Este e-mail ja tem uma conta. Use Entrar.';
  }

  return message || 'Erro ao processar autenticacao.';
};

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ensureSupabaseConfigured = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      setError('Configuracao ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureSupabaseConfigured()) return;

    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (mode === 'sign-up') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/worlds`
          }
        });

        if (signUpError) throw signUpError;

        if (data.session) {
          onLogin();
        } else {
          setNotice('Conta criada. Confira seu e-mail para confirmar o acesso.');
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      onLogin();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(getAuthErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!ensureSupabaseConfigured()) return;

    setIsLoading(true);
    setError(null);
    setNotice(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/worlds`
      }
    });

    if (oauthError) {
      setError(getAuthErrorMessage(oauthError));
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!ensureSupabaseConfigured()) return;
    if (!email) {
      setError('Digite seu e-mail para recuperar a senha.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotice(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`
    });

    if (resetError) {
      setError(getAuthErrorMessage(resetError));
    } else {
      setNotice('Enviamos um link de recuperacao para seu e-mail.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-blue-500/10 blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[450px] relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.img
            src="/logo.png"
            alt="Elite 2050"
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mb-6 h-20 w-20 rounded-2xl border border-white/20 bg-black/40 object-contain p-2 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
          />
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic flex flex-col items-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-cyan-400">Elite</span>
            <span className="text-2xl mt-[-8px] tracking-[0.3em] text-cyan-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">2050</span>
          </h1>
          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
              <Globe size={10} className="text-cyan-400" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Global Network</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-md">
              <Cpu size={10} className="text-fuchsia-400" />
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Quantum Engine</span>
            </div>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/5 blur-[80px] group-hover:bg-cyan-500/10 transition-all duration-700" />

          <div className="relative z-10 mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-white/[0.03] p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setMode('sign-in')}
              className={`rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'sign-in' ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-white'}`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode('sign-up')}
              className={`rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'sign-up' ? 'bg-cyan-500 text-black' : 'text-slate-500 hover:text-white'}`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {(error || notice) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`mb-6 p-4 rounded-2xl border flex items-start gap-3 ${error ? 'bg-red-500/10 border-red-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}
              >
                <AlertCircle className={`${error ? 'text-red-400' : 'text-cyan-400'} shrink-0 mt-0.5`} size={18} />
                <p className={`text-[10px] leading-relaxed font-black uppercase tracking-wider ${error ? 'text-red-200/80' : 'text-cyan-100/80'}`}>
                  {error || notice}
                </p>
              </motion.div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white/[0.04] border border-white/10 hover:border-cyan-500/40 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <Chrome size={18} className="text-cyan-400" />
              <span className="uppercase tracking-[0.2em] text-xs">Continuar com Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-600">ou</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                E-mail
              </label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-cyan-400 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.05] transition-all font-mono"
                  placeholder="voce@email.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Senha</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within/input:text-fuchsia-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500/50 focus:bg-white/[0.05] transition-all"
                  placeholder="minimo 6 caracteres"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all active:scale-[0.98] flex items-center justify-center gap-3 group/btn overflow-hidden relative"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="uppercase tracking-[0.2em] text-sm">
                    {mode === 'sign-in' ? 'Entrar no Sistema' : 'Criar Acesso'}
                  </span>
                  <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4 relative z-10">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={handlePasswordReset}
                className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-cyan-400 transition-colors"
              >
                Recuperar senha
              </button>
              <div className="w-[1px] h-3 bg-white/10" />
              <button
                type="button"
                onClick={() => setNotice('Use e-mail/senha ou Google. Seu progresso fica salvo no Supabase.')}
                className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-cyan-400 transition-colors"
              >
                Suporte
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={10} className="text-amber-500 animate-pulse" />
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Version 2.0.50-stable</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-[8px] text-slate-600 font-bold uppercase tracking-[0.3em] leading-relaxed">
          Propriedade da Federacao de Futebol de Elite. <br />
          Acesso nao autorizado sera rastreado pelo protocolo Quantum-Guard.
        </p>
      </motion.div>
    </div>
  );
};
