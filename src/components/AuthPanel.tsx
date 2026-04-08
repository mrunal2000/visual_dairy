import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/useAuth";

export function AuthPanel() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    try {
      if (mode === "signup") {
        const { error } = await signUp(email, password);
        if (error) {
          setMessage(error);
          return;
        }
        setMessage(
          "Check your email to confirm your account (if confirmation is enabled in Supabase), then sign in.",
        );
        setMode("signin");
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setMessage(error);
          return;
        }
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[360px] rounded-lg border border-black/[0.08] bg-white/60 p-6 shadow-sm">
      <h2 className="font-[family-name:var(--font-display)] text-lg text-black">
        {mode === "signin" ? "Sign in" : "Create account"}
      </h2>
      <p className="mt-1 text-sm leading-[18px] text-[#6B6B6B]">
        Save your journal and photos to your account. Works with Supabase on
        Vercel.
      </p>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-[#6B6B6B]">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[#6B6B6B]">
          Password
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        {message ? (
          <p className="text-sm leading-[18px] text-[#6B6B6B]">{message}</p>
        ) : null}

        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending
            ? "…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <button
        type="button"
        className="mt-4 w-full text-center text-sm text-[#6B6B6B] underline decoration-black/20 underline-offset-2 hover:text-black"
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setMessage(null);
        }}
      >
        {mode === "signin"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
