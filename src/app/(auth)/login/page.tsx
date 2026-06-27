"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { LogIn, Globe, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/room";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) { setError("Invalid email or password"); return; }
    router.push(callbackUrl);
  };

  const handleGoogle = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-sm"
    >
      <div className="glass rounded-3xl border shadow-2xl overflow-hidden bg-white/90 dark:bg-night-800/60 border-black/5 dark:border-white/10 p-8">
        <h1 className="text-2xl font-bold text-day-900 dark:text-white mb-1">Welcome back</h1>
        <p className="text-sm text-day-900/40 dark:text-white/40 mb-6">Sign in to your Togetherly account</p>

        <Button
          variant="secondary"
          className="w-full mb-4 flex items-center justify-center gap-2"
          onClick={handleGoogle}
        >
          <Globe className="w-4 h-4" />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
          <span className="text-xs text-day-900/30 dark:text-white/30">or</span>
          <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
        </div>

        <form onSubmit={handleCredentials} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-9 text-day-900/30 dark:text-white/30 hover:text-day-900/60 dark:hover:text-white/60 transition-colors"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <Button size="lg" className="w-full" type="submit" disabled={loading || !email || !password}>
            {loading ? "Signing in…" : <><LogIn className="w-4 h-4" /> Sign in</>}
          </Button>
        </form>

        <p className="text-center text-xs text-day-900/40 dark:text-white/40 mt-5">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-neon-purple hover:underline font-medium">
            Create one
          </Link>
        </p>

        <p className="text-center text-xs text-day-900/30 dark:text-white/30 mt-3">
          <Link href="/room" className="hover:underline">
            Continue as guest instead →
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
