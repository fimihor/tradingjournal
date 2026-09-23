import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, BarChart3, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function AuthScreen() {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const register = trpc.auth.register.useMutation();
  const login = trpc.auth.login.useMutation();
  const isPending = register.isPending || login.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (mode === "register") {
        const result = await register.mutateAsync({ email, password });
        toast.success(`Welcome, ${result.name}`, { description: "Your private journal is ready." });
      } else {
        await login.mutateAsync({ email, password });
        toast.success("Welcome back", { description: "Opening your trading journal." });
      }
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/^\[.*?\]\s*/, "") : "Something went wrong. Please try again.";
      toast.error(mode === "register" ? "Could not create account" : "Could not sign in", { description: message });
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-orb auth-orb-one" />
      <div className="auth-orb auth-orb-two" />
      <section className="auth-card">
        <div className="auth-brand-row">
          <div className="brand-mark"><span>T</span></div>
          <div><div className="brand-name">Trading Edge Journal</div><div className="brand-caption">TRADING JOURNAL</div></div>
        </div>
        <div className="auth-card-grid">
          <div className="auth-copy">
            <div className="auth-eyebrow"><Sparkles size={14} /> A calmer way to trade</div>
            <h1>Your edge gets clearer when you <em>write it down.</em></h1>
            <p>Keep your setups, risk, screenshots, and decisions in one private workspace built for consistency.</p>
            <div className="auth-promise-list">
              <div><span><Check size={13} /></span><p><strong>Review every decision</strong><small>See what worked before you repeat it.</small></p></div>
              <div><span><Check size={13} /></span><p><strong>Protect your downside</strong><small>Plan the risk before the trade begins.</small></p></div>
              <div><span><Check size={13} /></span><p><strong>Build a repeatable process</strong><small>Turn your journal into your advantage.</small></p></div>
            </div>
          </div>
          <div className="auth-panel">
            <div className="auth-panel-icon"><LockKeyhole size={18} /></div>
            <div className="panel-kicker">Your private workspace</div>
            <h2>{mode === "register" ? "Create your account" : "Welcome back"}</h2>
            <p>{mode === "register" ? "Start journaling in seconds. Your display name is created from your email." : "Sign in with the email and password you used to create your journal."}</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="auth-email">Email address</label>
              <Input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <label htmlFor="auth-password">Password <span>8+ characters</span></label>
              <div className="auth-password-wrap"><Input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="Enter your password" minLength={mode === "register" ? 8 : 1} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
              <Button type="submit" className="auth-primary" disabled={isPending}><span>{isPending ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}</span><ArrowRight size={16} /></Button>
            </form>
            <button className="auth-mode-toggle" type="button" onClick={() => setMode((current) => current === "register" ? "login" : "register")}>
              {mode === "register" ? "Already have an account? Sign in" : "New to Trading Edge Journal? Create an account"}
            </button>
            <div className="auth-divider"><span>secure access</span></div>
            <div className="auth-security"><ShieldCheck size={15} /><span>Your password is securely hashed</span></div>
            <div className="auth-note"><BarChart3 size={15} /><span>Your display name is generated automatically from your email.</span></div>
          </div>
        </div>
        <div className="auth-footer"><span>© 2026 Trading Edge Journal</span><span>Trade with intention.</span><span className="auth-footer-lock"><TrendingUp size={13} /> Private by design</span></div>
      </section>
    </main>
  );
}
