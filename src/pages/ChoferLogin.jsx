import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { AuthField } from '../components/AuthField';
import { AuthButton } from '../components/AuthButton';
import { LoginTransition } from '../components/LoginTransition';

/* ============================================================
   LOGIN — Chofer
   ============================================================ */
export const ChoferLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [successAnim, setSuccessAnim]   = useState(false);
  const [userName, setUserName]         = useState('');

  const handleLogin = async () => {
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const role = data.user?.user_metadata?.role || '';
      const name = data.user?.user_metadata?.nombre || data.user?.email || '';

      if (role !== 'chofer' && role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Esta cuenta no tiene acceso de Chofer.');
      }

      setUserName(name);
      setSuccessAnim(true);
      setTimeout(() => navigate('/chofer'), 2500);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleLogin(); };

  return (
    <>
      <LoginTransition isVisible={successAnim} userName={userName} />
      <AuthShell eyebrow="Transporte" testId="chofer-login-page">
        {error && (
          <div role="alert" data-testid="chofer-login-error" style={errorStyle}>
            {error}
          </div>
        )}

        <AuthField
          id="chofer-email"
          label="Correo"
          icon={Mail}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKey}
          placeholder="chofer@vinoplastic.com"
          disabled={loading}
          aria-required="true"
          data-testid="chofer-email-input"
        />

        <AuthField
          id="chofer-password"
          label="Contraseña"
          icon={Lock}
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKey}
          placeholder="••••••••"
          disabled={loading}
          aria-required="true"
          data-testid="chofer-password-input"
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              data-testid="chofer-toggle-password"
              style={eyeBtnStyle}
            >
              {showPassword
                ? <EyeOff size={16} strokeWidth={1.75} />
                : <Eye    size={16} strokeWidth={1.75} />
              }
            </button>
          }
        />

        <AuthButton
          onClick={handleLogin}
          loading={loading}
          loadingText="Verificando…"
          disabled={!email || !password}
          data-testid="chofer-submit-btn"
        >
          Iniciar turno
        </AuthButton>
      </AuthShell>
    </>
  );
};

const errorStyle = {
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--typography-body-sm-size)',
  lineHeight: 1.5,
  color: 'var(--color-semantic-error)',
  background: 'rgb(var(--color-semantic-error-raw) / 0.06)',
  border: '1px solid rgb(var(--color-semantic-error-raw) / 0.2)',
  borderRadius: 'var(--rounded-md)',
  padding: 'var(--spacing-sm) var(--spacing-base)',
  textAlign: 'center',
};

const eyeBtnStyle = {
  background: 'none',
  border: 'none',
  padding: 'var(--spacing-xxs)',
  cursor: 'pointer',
  color: 'var(--color-muted-soft)',
  display: 'inline-flex',
  alignItems: 'center',
};
