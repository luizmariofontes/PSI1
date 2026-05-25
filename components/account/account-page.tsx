"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Crown, Lock, Mail, Settings, UserMinus, UserPlus, Users } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/audit-utils";
import { CompanyDetails } from "@/lib/types";

export function AccountPage() {
  const {
    currentCompany,
    getCompanyAudits,
    updateAccount,
    loadCompany,
    inviteCompanyMember,
    removeCompanyMember,
  } = useApp();
  const [companyName, setCompanyName] = useState(currentCompany?.name || "");
  const [email, setEmail] = useState(currentCompany?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [company, setCompany] = useState<CompanyDetails | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [companySuccess, setCompanySuccess] = useState("");
  const [companyLoading, setCompanyLoading] = useState(false);

  const audits = getCompanyAudits();
  const hasCompany = Boolean(currentCompany?.companyId);
  const isOwner = company?.ownerId === currentCompany?.id;

  useEffect(() => {
    setCompanyName(currentCompany?.name || "");
    setEmail(currentCompany?.email || "");
  }, [currentCompany?.name, currentCompany?.email]);

  useEffect(() => {
    if (!hasCompany) {
      setCompany(null);
      return;
    }
    let active = true;
    loadCompany().then((data) => {
      if (active) setCompany(data);
    });
    return () => {
      active = false;
    };
  }, [loadCompany, hasCompany]);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    setCompanyError("");
    setCompanySuccess("");

    const trimmed = inviteEmail.trim();
    if (!trimmed) {
      setCompanyError("Informe o email do membro.");
      return;
    }

    setCompanyLoading(true);
    const result = await inviteCompanyMember(trimmed);
    setCompanyLoading(false);

    if (!result.success || !result.company) {
      setCompanyError(result.error || "Nao foi possivel adicionar o membro.");
      return;
    }

    setCompany(result.company);
    setInviteEmail("");
    setCompanySuccess(`Membro adicionado: ${trimmed}.`);
  };

  const handleRemoveMember = async (memberId: string) => {
    setCompanyError("");
    setCompanySuccess("");
    setCompanyLoading(true);
    const result = await removeCompanyMember(memberId);
    setCompanyLoading(false);

    if (!result.success || !result.company) {
      setCompanyError(result.error || "Nao foi possivel remover o membro.");
      return;
    }

    setCompany(result.company);
    setCompanySuccess("Membro removido.");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword || confirmPassword || currentPassword) {
      if (!newPassword || !confirmPassword || !currentPassword) {
        setError(
          "Preencha senha atual, nova senha e confirmação para alterar a senha.",
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        setError("A confirmação da senha não confere.");
        return;
      }
    }

    setLoading(true);
    const result = await updateAccount({
      // Usuario nao-proprietario nao tem permissao para renomear a empresa.
      companyName: isOwner ? companyName : "",
      email,
      currentPassword,
      newPassword,
    });
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Não foi possível salvar as alterações.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setSuccess("Dados atualizados com sucesso.");
  };

  if (!currentCompany) {
    return null;
  }

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">
          {hasCompany
            ? "Gerencie dados de acesso e informações da empresa."
            : "Gerencie dados de acesso. Você ainda não pertence a nenhuma empresa — peça ao proprietário para te adicionar."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Dados de acesso</h2>
              <p className="text-xs text-slate-500">
                As alterações são salvas no servidor.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className={hasCompany ? "grid gap-4 md:grid-cols-2" : "grid gap-4"}>
              {hasCompany && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da empresa</Label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(event) => {
                        if (!isOwner) return;
                        setCompanyName(event.target.value);
                        setError("");
                        setSuccess("");
                      }}
                      readOnly={!isOwner}
                      aria-readonly={!isOwner}
                      title={isOwner ? undefined : "Somente o proprietario da empresa pode alterar o nome."}
                      className={
                        isOwner
                          ? "h-12 rounded-xl pl-11"
                          : "h-12 rounded-xl pl-11 cursor-not-allowed bg-slate-50 text-slate-500"
                      }
                    />
                  </div>
                  {!isOwner && (
                    <p className="text-xs text-slate-500">
                      Apenas o proprietário pode alterar o nome da empresa.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="accountEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="accountEmail"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError("");
                      setSuccess("");
                    }}
                    className="h-12 rounded-xl pl-11"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-900">Alterar senha</h3>
                <p className="text-xs text-slate-500">
                  Deixe em branco para manter a senha atual.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha atual</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="********"
                      value={currentPassword}
                      onChange={(event) => {
                        setCurrentPassword(event.target.value);
                        setError("");
                        setSuccess("");
                      }}
                      className="h-12 rounded-xl bg-white pl-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="********"
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setError("");
                      setSuccess("");
                    }}
                    className="h-12 rounded-xl bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setError("");
                      setSuccess("");
                    }}
                    className="h-12 rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 rounded-xl bg-blue-600 px-6 font-semibold hover:bg-blue-700"
              >
                {loading ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          {hasCompany && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                Empresa
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {currentCompany.name}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {currentCompany.email}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Resumo
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Auditorias</span>
                <span className="font-semibold text-slate-900">
                  {audits.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Cadastro</span>
                <span className="font-semibold text-slate-900">
                  {formatDate(currentCompany.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {hasCompany && (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Empresa e membros</h2>
            <p className="text-xs text-slate-500">
              Auditorias sao compartilhadas entre os membros da empresa.
              {isOwner && " Apenas voce (proprietario) pode adicionar ou remover membros."}
            </p>
          </div>
        </div>

        {company ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-slate-400">Empresa</p>
              <p className="mt-1 text-base font-semibold text-slate-900">{company.name}</p>
              <p className="text-xs text-slate-500">
                Criada em {formatDate(company.createdAt)} - {company.members.length}{" "}
                {company.members.length === 1 ? "membro" : "membros"}
              </p>
            </div>

            {isOwner && (
              <form onSubmit={handleInvite} className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Adicionar membro por email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="inviteEmail"
                      type="email"
                      placeholder="auditor@empresa.com"
                      value={inviteEmail}
                      onChange={(event) => {
                        setInviteEmail(event.target.value);
                        setCompanyError("");
                        setCompanySuccess("");
                      }}
                      className="h-12 rounded-xl pl-11"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    O usuario precisa ter uma conta no WhoISO. Ao adicionar, ele passa a enxergar as auditorias da empresa.
                  </p>
                </div>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={companyLoading}
                    className="h-12 rounded-xl bg-emerald-600 px-5 font-semibold hover:bg-emerald-700"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    {companyLoading ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </form>
            )}

            {companyError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {companyError}
              </div>
            )}

            {companySuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {companySuccess}
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Membro</th>
                    <th className="px-4 py-3">Cadastro</th>
                    <th className="px-4 py-3 text-right">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {company.members.map((member) => (
                    <tr key={member.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-medium text-slate-900">
                          {member.email}
                          {member.isOwner && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                              <Crown className="h-3 w-3" />
                              Proprietario
                            </span>
                          )}
                          {member.id === currentCompany?.id && !member.isOwner && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                              Voce
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(member.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!member.isOwner && (isOwner || member.id === currentCompany?.id) && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={companyLoading}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <UserMinus className="mr-1 h-4 w-4" />
                            {member.id === currentCompany?.id ? "Sair" : "Remover"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Carregando informacoes da empresa...</p>
        )}
      </section>
      )}
    </div>
  );
}
