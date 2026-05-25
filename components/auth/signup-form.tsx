"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Building2, Lock, Mail, Loader2 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WhoISOLogo } from "@/components/brand/whoiso-logo";
import { AuthChallenge } from "@/lib/types";
import { OTPVerificationForm } from "./otp-verification-form";
import { cn } from "@/lib/utils";

type SignupMode = "user" | "company";

export function SignupForm() {
  const router = useRouter();
  const { signupUser, signupCompany, currentCompany, isInitializing } = useApp();
  const [mode, setMode] = useState<SignupMode>("company");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);

  useEffect(() => {
    if (!isInitializing && currentCompany) {
      router.push("/");
    }
  }, [isInitializing, currentCompany, router]);

  if (isInitializing || currentCompany) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const switchMode = (next: SignupMode) => {
    if (next === mode) return;
    setMode(next);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError("Preencha email e senha.");
      return;
    }

    if (password.length < 6) {
      setError("Use uma senha com pelo menos 6 caracteres.");
      return;
    }

    if (mode === "company" && !companyName.trim()) {
      setError("Informe o nome da empresa.");
      return;
    }

    setLoading(true);
    const result =
      mode === "company"
        ? await signupCompany(companyName, email, password)
        : await signupUser(email, password);
    setLoading(false);

    if (!result.success || !result.challenge) {
      setError(result.error || "Nao foi possivel concluir o cadastro.");
      return;
    }

    setChallenge(result.challenge);
  };

  const subtitle =
    mode === "company"
      ? "Cadastre sua empresa para acessar o painel."
      : "Crie sua conta de usuario. Voce poderá ser adicionado a uma empresa pelo proprietario.";

  return (
    <div className="grid min-h-screen bg-white md:grid-cols-[0.94fr_1.06fr]">
      <section className="flex min-h-screen items-center justify-center px-6 py-10 md:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <WhoISOLogo className="mb-10 w-48" />

          {challenge ? (
            <OTPVerificationForm
              challenge={challenge}
              onBack={() => setChallenge(null)}
              onVerified={() => router.push("/")}
            />
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
                Cadastro
              </p>
              <h1 className="mt-3 text-4xl font-bold text-slate-900">
                Crie sua conta
              </h1>
              <p className="mt-3 text-base text-slate-500">{subtitle}</p>

              <div className="mt-7 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => switchMode("company")}
                  className={cn(
                    "rounded-lg px-3 py-2 transition-colors",
                    mode === "company"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  Cadastro de empresa
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("user")}
                  className={cn(
                    "rounded-lg px-3 py-2 transition-colors",
                    mode === "user"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  Cadastro de usuario
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                {mode === "company" && (
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da empresa</Label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="Acme Seguranca"
                        value={companyName}
                        onChange={(e) => {
                          setCompanyName(e.target.value);
                          setError("");
                        }}
                        className="h-12 rounded-xl pl-11"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      O email informado abaixo sera registrado como proprietario da empresa.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signupEmail">
                    {mode === "company" ? "Email do proprietario" : "Email"}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="voce@empresa.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      className="h-12 rounded-xl pl-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="signupPassword"
                      type="password"
                      placeholder="Minimo de 6 caracteres"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      className="h-12 rounded-xl pl-11"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-blue-600 font-semibold hover:bg-blue-700"
                >
                  {loading
                    ? "Criando..."
                    : mode === "company"
                      ? "Criar empresa"
                      : "Criar conta"}
                </Button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-500">
                Ja tem conta?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </section>

      <section className="relative hidden min-h-screen flex-col bg-[#0f172a] px-12 py-10 text-white lg:px-16 md:flex">
        <div className="flex flex-1 flex-col justify-center">
          <div className="max-w-xl">
            <h2 className="text-5xl font-bold leading-tight tracking-normal lg:text-6xl">
              Eleve o nivel de seguranca do seu negocio.
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
              Crie sua conta para iniciar diagnosticos precisos e organizar todos os dados de conformidade da sua empresa de forma estruturada.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
