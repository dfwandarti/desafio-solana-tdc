export function getUserFriendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("DebtAlreadyPaid")) {
    return "Um ou mais débitos selecionados já foram pagos.";
  }
  if (message.includes("DebtNotFound")) {
    return "Débito não encontrado para esta placa.";
  }
  if (message.includes("InvalidSelectionCount")) {
    return "Selecione 1 ou 2 débitos para pagar.";
  }
  if (message.includes("DuplicateDebtSelection")) {
    return "Débito selecionado em duplicidade.";
  }

  return "Ocorreu um erro inesperado. Tente novamente.";
}
