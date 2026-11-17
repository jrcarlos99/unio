// Regra de ouro da integração (ADR-007): o front só manda ao back ids
// numéricos reais (inteiro positivo, como os userId e meetingId do back).
// Ids de exemplo dos mocks (slugs como "biopay" ou "marcos-andrade") nunca
// viram chamada HTTP: quem recebe um deles continua no mock.
//
// Funções puras, testadas em tests/idsBack.test.ts.

// "42" ou 42 → true; "biopay", "", "0", "-3", "4.5", "1e3", NaN → false
export function ehIdDoBack(id: string | number | null | undefined): boolean {
  return paraIdDoBack(id) !== null;
}

// Converte para o número do back, ou null quando não é um id real
export function paraIdDoBack(id: string | number | null | undefined): number | null {
  if (typeof id === "number") return Number.isSafeInteger(id) && id > 0 ? id : null;
  if (typeof id !== "string") return null;
  const limpo = id.trim();
  // Só dígitos: recusa "1e3", "0x10", " 4.0" e afins, que Number() aceitaria
  if (!/^\d+$/.test(limpo)) return null;
  const numero = Number(limpo);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : null;
}
