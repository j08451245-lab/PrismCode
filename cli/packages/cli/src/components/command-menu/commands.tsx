// =============================================================================
// Lista de comandos do palette - PrismCode
// Define todos os comandos disponíveis no menu de comandos (Ctrl+P ou /).
// Cada comando tem nome, descrição, valor de inserção, e ação executada.
// =============================================================================

import { SUPPORTED_CHAT_MODELS } from "@prismcode543/shared";
import {
  AgentsDialogContent,
  ModelsDialogContent,
  SessionsDialogContent,
  ThemeDialogContent,
  SearchDialogContent,
  SkillsDialogContent,
  ApiDialogContent,
} from "../dialogs";
import type { Command } from "./types";

import { performLogin } from "../../lib/oauth";
import { clearAuth, getAuth } from "../../lib/auth";
import { openBillingPortal, openUpgradeCheckout } from "../../lib/upgrade";
import { getDefaultModel, hasLocalKey } from "../../lib/local-model";
import { openInDesktop } from "../../lib/desktop";

function isLocalMode(): boolean {
  const auth = getAuth();
  if (auth) return false;
  try {
    const { provider } = getDefaultModel();
    return hasLocalKey(provider);
  } catch {
    return false;
  }
}

// Lista de todos os comandos disponíveis
export const COMMANDS: Command[] = [
  // /new — Cria nova conversa
  {
    name: "new",
    description: "Start a new conversation",
    value: "/new",
    action: (ctx) => { ctx.navigate("/"); },
  },

  // /agents — Troca o agente (modo de operação)
  {
    name: "agents",
    description: "Switch agents",
    value: "/agents",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Agent",
        children: <AgentsDialogContent currentMode={ctx.mode} onSelectMode={ctx.setMode} />,
      });
    },
  },

  // /models — Seleciona modelo de IA
  {
    name: "models",
    description: "Select AI model for generation",
    value: "/models",
    action: (ctx) => {
      ctx.dialog.open({
        title: "Select Model",
        children: (
          <ModelsDialogContent
            models={SUPPORTED_CHAT_MODELS.map((model) => model.id)}
            onSelectModel={ctx.setModel}
          />
        ),
      });
    },
  },

  // /sessions — Navega sessões anteriores
  {
    name: "sessions",
    description: "Browse past sessions",
    value: "/sessions",
    action: (ctx) => {
      ctx.dialog.open({ title: "Sessions", children: <SessionsDialogContent /> });
    },
  },

  // /theme — Muda o tema visual
  {
    name: "theme",
    description: "Change color theme",
    value: "/theme",
    action: (ctx) => {
      ctx.dialog.open({ title: "Select Theme", children: <ThemeDialogContent /> });
    },
  },

  // /login — Faz login via navegador
  {
    name: "login",
    description: "Sign in with your browser",
    value: "/login",
    action: async (ctx) => {
      ctx.toast.show({ message: "Opening browser to sign in..." });
      try {
        await performLogin();
        ctx.toast.show({ variant: "success", message: "Signed in" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sign in failed or timed out";
        ctx.toast.show({ variant: "error", message });
      }
    },
  },

  // /logout — Faz logout
  {
    name: "logout",
    description: "Sign out of your account",
    value: "/logout",
    action: (ctx) => {
      clearAuth();
      ctx.toast.show({ variant: "success", message: "Signed out" });
    },
  },

  // /upgrade — Abre checkout de upgrade
  {
    name: "upgrade",
    description: "Buy more credits",
    value: "/upgrade",
    action: async (ctx) => {
      if (isLocalMode()) {
        ctx.toast.show({ variant: "error", message: "Not available in offline mode — you are using a local API key" });
        return;
      }
      ctx.toast.show({ message: "Opening credits checkout..." });
      try {
        await openUpgradeCheckout();
        ctx.toast.show({ variant: "success", message: "Checkout opened in browser" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to open checkout";
        ctx.toast.show({ variant: "error", message });
      }
    },
  },

  // /usage — Abre portal de billing
  {
    name: "usage",
    description: "Open billing portal in your browser",
    value: "/usage",
    action: async (ctx) => {
      if (isLocalMode()) {
        ctx.toast.show({ variant: "error", message: "Not available in offline mode — you are using a local API key" });
        return;
      }
      ctx.toast.show({ message: "Opening billing portal..." });
      try {
        await openBillingPortal();
        ctx.toast.show({ variant: "success", message: "Billing portal opened in browser" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to open billing portal";
        ctx.toast.show({ variant: "error", message });
      }
    },
  },

  // /skills — Gerencia skills instaladas
  {
    name: "skills",
    description: "Manage installed skills",
    value: "/skills",
    action: (ctx) => {
      ctx.dialog.open({ title: "Skills", children: <SkillsDialogContent /> });
    },
  },

  // /api — Configura chaves de API dos provedores
  {
    name: "api",
    description: "Configure provider API keys",
    value: "/api",
    action: (ctx) => {
      ctx.dialog.open({
        title: "API Configuration",
        children: <ApiDialogContent />,
      });
    },
  },

  // /app — Abre a pasta atual no PrismCode Desktop
  {
    name: "app",
    description: "Open this folder in PrismCode Desktop",
    value: "/app",
    action: (ctx) => {
      try {
        openInDesktop(process.cwd());
        ctx.toast.show({ variant: "success", message: "Opening PrismCode Desktop" });
      } catch (error) {
        ctx.toast.show({
          variant: "error",
          message: error instanceof Error ? error.message : "Could not open PrismCode Desktop",
        });
      }
    },
  },

  // /search — Busca conversas anteriores
  {
    name: "search",
    description: "Search past conversations",
    value: "/search",
    action: (ctx) => {
      ctx.dialog.open({ title: "Search Conversations", children: <SearchDialogContent /> });
    },
  },

  // /exit — Sai da aplicação
  {
    name: "exit",
    description: "Quit the application",
    value: "/exit",
    action: (ctx) => { ctx.exit(); },
  },
];

