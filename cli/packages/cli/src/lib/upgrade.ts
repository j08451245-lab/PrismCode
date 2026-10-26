// =============================================================================
// Funções de upgrade/billing do CLI - PrismCode
// Abre o checkout de upgrade e o portal de billing no navegador.
// =============================================================================

import open from "open";              // Abre URLs no navegador
import { apiClient } from "./api-client"; // Cliente API do servidor
import { getErrorMessage } from "./http-errors";

// Abre a página de checkout para assinar um plano
export async function openUpgradeCheckout() {
  const response = await apiClient.billing.checkout.$post();

  if (response.ok) {
    const data = await response.json();
    await open(data.url); // Abre URL de checkout no navegador
    return;
  }

  throw new Error(await getErrorMessage(response));
};

// Abre o portal do cliente para gerenciar assinatura
export async function openBillingPortal() {
  const response = await apiClient.billing.portal.$post();

  if (response.ok) {
    const data = await response.json();
    await open(data.url); // Abre portal do Polar no navegador
    return;
  }

  throw new Error(await getErrorMessage(response));
};
