import api from "./api";

// Direitos do titular (LGPD), seção "Privacidade e dados" do Meu perfil
// (ADR-010). Usa os endpoints que o back já tinha (T13): GET /api/privacy/export
// e POST /api/privacy/delete-account.

// Baixa o JSON com os dados do titular. O nome do arquivo leva só a data.
export async function exportarMeusDados(): Promise<void> {
  const { data } = await api.get<unknown>("/api/privacy/export");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `meus-dados-unio-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Exclusão por anonimização (D029 do back). Exige a senha atual e a
// confirmação explícita de que é irreversível.
export async function excluirMinhaConta(senha: string): Promise<void> {
  await api.post("/api/privacy/delete-account", { password: senha, confirmed: true });
}
