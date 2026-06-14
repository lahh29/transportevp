import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { AuthField } from '../components/AuthField';
import { AuthButton } from '../components/AuthButton';
import { LoginTransition } from '../components/LoginTransition';

/* ============================================================
   LOGIN — Administración
   ============================================================ */
export const Login = () => {
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

      const role = data.user?.user_metadata?.role || 'usuario';
      const name = data.user?.user_metadata?.nombre || '';

      setUserName(name);
      setSuccessAnim(true);

      setTimeout(() => {
        if (role === 'admin')        navigate('/empresa');
        else if (role === 'chofer')  navigate('/chofer');
        else                         navigate('/');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleLogin(); };

  return (
    <>
      <LoginTransition isVisible={successAnim} userName={userName} />
      <AuthShell eyebrow="Administración" testId="admin-login-page">
        {error && (
          <div role="alert" data-testid="login-error" style={errorStyle}>
            {error}
          </div>
        )}

        <AuthField
          id="admin-email"
          label="Correo"
          icon={Mail}
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKey}
          placeholder="usuario@vinoplastic.com"
          disabled={loading}
          aria-required="true"
          data-testid="admin-email-input"
        />

        <AuthField
          id="admin-password"
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
          data-testid="admin-password-input"
          suffix={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              data-testid="admin-toggle-password"
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
          data-testid="admin-submit-btn"
        >
          Entrar
        </AuthButton>
      </AuthShell>
    </>
  );
};

/* ─── Inline styles compartidos ─── */
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
