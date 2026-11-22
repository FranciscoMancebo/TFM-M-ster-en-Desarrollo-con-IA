'use client';

import { type SubmitEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/language-toggle';
import type { Language } from '@/lib/workout/types';
import { useI18n } from '@/lib/i18n';
import { getSupabaseClient } from '@/lib/supabase/client';

function AuthBrand() {
  return <div className="brand-lockup" aria-label="Haltero"><span className="brand-mark" aria-hidden="true">H</span><span>HALTERO</span></div>;
}

export function AuthScreen({ onChangeLanguage }: { onChangeLanguage: (language: Language) => void }) {
  const { tr } = useI18n();
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const supabase = getSupabaseClient();

    if (mode === 'recovery') {
      const result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      setPending(false);
      setMessage(result.error ? result.error.message : tr('Si existe una cuenta con ese correo, recibirás un enlace para crear una nueva contraseña.', 'If an account exists for that email, you will receive a link to create a new password.'));
      return;
    }

    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName.trim() } } });
    setPending(false);
    if (result.error) return setMessage(result.error.message);
    if (mode === 'signup' && !result.data.session) setMessage(tr('Cuenta creada. Revisa tu correo para confirmarla antes de entrar.', 'Account created. Check your email to confirm it before signing in.'));
  }

  return <main className="auth-page">
    <section className="auth-panel" aria-labelledby="auth-title">
      <div className="auth-panel-top"><AuthBrand /><LanguageToggle onChange={onChangeLanguage} /></div>
      <div className="auth-copy"><p className="eyebrow">{tr('Tu entrenamiento, siempre contigo', 'Your training, always with you')}</p><h1 id="auth-title">{mode === 'login' ? tr('Entrar en Haltero', 'Sign in to Haltero') : mode === 'signup' ? tr('Crear una cuenta', 'Create an account') : tr('Recuperar contraseña', 'Reset password')}</h1><p>{mode === 'recovery' ? tr('Te enviaremos un enlace seguro para elegir una contraseña nueva.', 'We will send you a secure link to choose a new password.') : tr('Guarda tus rutinas, sesiones y progreso de forma segura.', 'Keep your routines, sessions and progress safe.')}</p></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && <label><span>{tr('Nombre', 'Name')}</span><input required minLength={2} maxLength={60} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
        <label><span>{tr('Correo electrónico', 'Email')}</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        {mode !== 'recovery' && <label><span>{tr('Contraseña', 'Password')}</span><input required type="password" minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
        {message && <output className="auth-message">{message}</output>}
        <Button size="lg" type="submit" disabled={pending}>{pending ? tr('Procesando…', 'Processing…') : mode === 'login' ? tr('Entrar', 'Sign in') : mode === 'signup' ? tr('Crear cuenta', 'Create account') : tr('Enviar enlace', 'Send link')}</Button>
      </form>
      <div className="auth-links">
        <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>{mode === 'login' ? tr('¿Primera vez? Crear una cuenta', 'New here? Create an account') : tr('Volver a iniciar sesión', 'Back to sign in')}</button>
        {mode === 'login' && <button className="auth-switch" type="button" onClick={() => { setMode('recovery'); setMessage(''); }}>{tr('He olvidado mi contraseña', 'I forgot my password')}</button>}
      </div>
    </section>
    <aside className="auth-visual" aria-hidden="true"><span>01</span><strong>{tr('ENTRENA', 'TRAIN')}<br />{tr('REGISTRA', 'TRACK')}<br />{tr('PROGRESA', 'PROGRESS')}</strong></aside>
  </main>;
}

export function PasswordRecoveryScreen({ onComplete }: { onComplete: () => void }) {
  const { tr } = useI18n();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function updatePassword(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) return setMessage(tr('Las contraseñas no coinciden.', 'Passwords do not match.'));
    setPending(true);
    const { error } = await getSupabaseClient().auth.updateUser({ password });
    setPending(false);
    if (error) return setMessage(error.message);
    window.history.replaceState({}, '', window.location.pathname);
    onComplete();
  }

  return <main className="auth-page"><section className="auth-panel" aria-labelledby="recovery-title"><AuthBrand /><div className="auth-copy"><p className="eyebrow">{tr('Cuenta segura', 'Secure account')}</p><h1 id="recovery-title">{tr('Crea una contraseña nueva', 'Create a new password')}</h1><p>{tr('Utiliza al menos ocho caracteres y no reutilices una contraseña de otro servicio.', 'Use at least eight characters and do not reuse a password from another service.')}</p></div><form className="auth-form" onSubmit={updatePassword}><label><span>{tr('Nueva contraseña', 'New password')}</span><input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label><span>{tr('Repetir contraseña', 'Confirm password')}</span><input required type="password" minLength={8} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{message && <output className="auth-message">{message}</output>}<Button size="lg" type="submit" disabled={pending || password.length < 8 || password !== confirmation}>{pending ? tr('Guardando…', 'Saving…') : tr('Guardar contraseña', 'Save password')}</Button></form></section></main>;
}
