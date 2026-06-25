import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { App } from "./App.tsx";
import { supabase, supabaseEnabled } from "./supabase.ts";

// Auth gate. When Supabase is configured the admin requires an email/password
// login (the client). When it isn't (plain local demo), it drops straight
// through to the offline editor.
export function Root() {
  if (!supabaseEnabled) return <App session={null} />;
  return <Gated />;
}

function Gated() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase!.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase!.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="loading">Connecting…</div>;
  if (session === null) return <Login />;
  return <App session={session} />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    setBusy(false);
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="brand" style={{ marginBottom: 18 }}>
          <span className="mark">I</span>
          <span>Indy Pass Admin</span>
        </div>
        <h1 className="login-title">Sign in</h1>
        <p className="login-sub">Manage blackouts, reservations and lodging.</p>
        <label>Email</label>
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label style={{ marginTop: 12 }}>Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {err && <div className="login-err">{err}</div>}
        <button className="btn primary" type="submit" disabled={busy} style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
