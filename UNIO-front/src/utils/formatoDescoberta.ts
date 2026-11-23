// Formatação dos valores das telas do investidor. Vírgula decimal (pt-BR) e
// sufixo "M" para milhões, como nos cards: "R$ 300 mil", "R$ 3,2M", "9,3%".

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function formatarMoeda(valor: number) {
  if (valor >= 1_000_000) return `R$ ${decimal.format(valor / 1_000_000)}M`;
  if (valor >= 1_000) return `R$ ${decimal.format(valor / 1_000)} mil`;
  return `R$ ${decimal.format(valor)}`;
}

export function formatarPercentual(valor: number) {
  return `${decimal.format(valor)}%`;
}

// Busca sem acento e sem diferenciar maiúsculas ("Saúde" acha "saude")
export function normalizarBusca(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

// "Fintech, B2B SaaS, AgTech & HealthTech"
export function juntarComE(itens: string[]) {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} & ${itens[itens.length - 1]}`;
}

// Valor curto para faixas de ticket: "R$ 150k", "R$ 1,5M"
function curto(valor: number) {
  if (valor >= 1_000_000) return `${decimal.format(valor / 1_000_000)}M`;
  return `${decimal.format(valor / 1_000)}k`;
}

// "R$ 150k - 500k" (ou com outro separador, ex.: " a ")
export function formatarFaixaTicket(minimo: number, maximo: number, separador = " - ") {
  return `R$ ${curto(minimo)}${separador}${curto(maximo)}`;
}
