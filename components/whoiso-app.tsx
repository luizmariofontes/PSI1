"use client";

import { useApp } from "@/lib/app-context";
import { LoginForm } from "@/components/auth/login-form";
import { Sidebar } from "@/components/layouts/sidebar";
import { AuditPage } from "@/components/audit/audit-page";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { HistoryPage } from "@/components/history/history-page";
import { AuditLogsPage } from "@/components/history/audit-logs-page";
import { AccountPage } from "@/components/account/account-page";

export function WhoISOApp() {
  const { currentView } = useApp();

  if (currentView === "login") {
    return <LoginForm />;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f8fafc' }}>
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ background: '#f8fafc' }}
      >
        {currentView === "dashboard" && <DashboardPage />}
        {currentView === "audit" && <AuditPage />}
        {currentView === "history" && <HistoryPage />}
        {currentView === "auditLogs" && <AuditLogsPage />}
        {currentView === "account" && <AccountPage />}
      </main>
    </div>
  );
}
