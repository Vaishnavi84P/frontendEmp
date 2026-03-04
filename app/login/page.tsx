'use client';
// login/page.tsx - Login and Register page combined
// Using separate useState per field - more reliable than one big form object

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/context/AuthContext';
import { authAPI } from '../../src/services/api';

export default function LoginPage() {
  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [errorMsg, setErrorMsg]     = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading]   = useState(false);

  const { login } = useAuth();
  const router    = useRouter();

  const switchTab = (tab) => { setMode(tab); setErrorMsg(''); setSuccessMsg(''); };

  const handleSubmit = async () => {
    setErrorMsg(''); setSuccessMsg('');
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) { setErrorMsg('Email and password are required.'); return; }
    if (mode === 'register') {
      if (!username.trim())     { setErrorMsg('Username is required.'); return; }
      if (password !== confirm) { setErrorMsg('Passwords do not match.'); return; }
      if (password.length < 8)  { setErrorMsg('Password must be at least 8 characters.'); return; }
    }
    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login(cleanEmail, password);
        router.push('/dashboard');
      } else {
        await authAPI.register({ username: username.trim(), email: cleanEmail, password });
        setSuccessMsg('Account created! You can now sign in.');
        switchTab('login');
        setEmail(''); setPassword(''); setUsername(''); setConfirm('');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const onKey = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', top:'-20%', left:'-10%', width:'60vw', height:'60vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:'-20%', right:'-10%', width:'50vw', height:'50vw', borderRadius:'50%', background:'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
      <div style={{ width:'100%', maxWidth:420, position:'relative', zIndex:1 }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:56, height:56, borderRadius:16, background:'linear-gradient(135deg, var(--accent), var(--accent2))', fontSize:26, marginBottom:16, boxShadow:'0 8px 32px rgba(0,212,255,0.25)' }}>ligntning</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', fontWeight:800, background:'linear-gradient(135deg, var(--accent), var(--accent2))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'-0.03em' }}>xLM Onboard</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:4 }}>AI-Powered Employee Onboarding Platform</p>
        </div>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:32, boxShadow:'var(--shadow)' }}>
          <div style={{ display:'flex', background:'var(--surface2)', borderRadius:'var(--radius-sm)', padding:4, marginBottom:28 }}>
            {['login','register'].map((tab) => (
              <button key={tab} onClick={() => switchTab(tab)} style={{ flex:1, padding:'8px 0', cursor:'pointer', borderRadius:6, fontSize:'0.875rem', fontWeight:600, fontFamily:'var(--font-body)', textTransform:'capitalize', transition:'all 0.15s', background:mode===tab?'var(--surface)':'transparent', color:mode===tab?'var(--text)':'var(--text-muted)', border:mode===tab?'1px solid var(--border)':'1px solid transparent' }}>{tab}</button>
            ))}
          </div>
          {errorMsg   && <div className="alert alert-danger"  style={{marginBottom:16}}>warning {errorMsg}</div>}
          {successMsg && <div className="alert alert-success" style={{marginBottom:16}}>check {successMsg}</div>}
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" placeholder="johndoe" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={onKey} autoComplete="username" />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={onKey} autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder={mode==='register'?'Min. 8 characters':'...'} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={onKey} autoComplete={mode==='login'?'current-password':'new-password'} />
          </div>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={onKey} autoComplete="new-password" />
            </div>
          )}
          <button onClick={handleSubmit} disabled={isLoading} className="btn btn-primary" style={{ justifyContent:'center', height:44, marginTop:8, width:'100%' }}>
            {isLoading && <span className="spinner" style={{ width:18, height:18 }} />}
            {isLoading ? 'Please wait...' : mode==='login' ? 'Sign In' : 'Create Account'}
          </button>
          {mode === 'login' && (
            <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem', marginTop:16 }}>
              Default admin: <code style={{ color:'var(--accent)', background:'rgba(0,212,255,0.08)', padding:'1px 6px', borderRadius:4 }}>admin@admin.com</code>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}