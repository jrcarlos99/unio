// Datas das reuniões no fuso fixo America/Recife (GMT-3, sem horário de
// verão), independentemente do fuso do navegador. Armazenamento em ISO (UTC);
// tudo o que aparece na tela passa por aqui. Semana começa na segunda.
//
// "Chave de dia" = "AAAA-MM-DD" no calendário de Recife. Funções puras (sem
// imports de runtime) para rodar também nos testes com node --test.

export const FUSO_ROTULO = "Horário de Brasília (GMT-3)";

const DESLOCAMENTO_MS = -3 * 60 * 60 * 1000;
const MINUTO_MS = 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
// Índice 0 = segunda
export const DIAS_CURTOS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
export const DIAS_LONGOS = [
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
  "domingo",
];
// Para aria-label: "Pitch Verde Pay, quinta, 14:00 a 14:45, confirmada"
const DIAS_FALA = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];

export interface PartesData {
  ano: number;
  // 1 a 12
  mes: number;
  dia: number;
  hora: number;
  minuto: number;
  // 0 = segunda ... 6 = domingo
  diaSemana: number;
}

function dois(n: number) {
  return String(n).padStart(2, "0");
}

function paraData(valor: string | Date) {
  return typeof valor === "string" ? new Date(valor) : valor;
}

export function isoValido(valor: string | undefined | null): valor is string {
  return typeof valor === "string" && !Number.isNaN(new Date(valor).getTime());
}

// Data/hora "de parede" em Recife
export function partesRecife(valor: string | Date): PartesData {
  const deslocada = new Date(paraData(valor).getTime() + DESLOCAMENTO_MS);
  return {
    ano: deslocada.getUTCFullYear(),
    mes: deslocada.getUTCMonth() + 1,
    dia: deslocada.getUTCDate(),
    hora: deslocada.getUTCHours(),
    minuto: deslocada.getUTCMinutes(),
    diaSemana: (deslocada.getUTCDay() + 6) % 7,
  };
}

// Data/hora de Recife → ISO em UTC
export function isoDeRecife(ano: number, mes: number, dia: number, hora = 0, minuto = 0): string {
  return new Date(Date.UTC(ano, mes - 1, dia, hora, minuto) - DESLOCAMENTO_MS).toISOString();
}

export function chaveDia(valor: string | Date): string {
  const { ano, mes, dia } = partesRecife(valor);
  return `${ano}-${dois(mes)}-${dois(dia)}`;
}

export function hojeChave(agora: Date = new Date()): string {
  return chaveDia(agora);
}

function partesDaChave(chave: string) {
  const [ano, mes, dia] = chave.split("-").map(Number);
  return { ano, mes, dia };
}

// Meia-noite de Recife do dia → ISO
export function inicioDoDia(chave: string): string {
  const { ano, mes, dia } = partesDaChave(chave);
  return isoDeRecife(ano, mes, dia);
}

export function somarDias(chave: string, dias: number): string {
  const { ano, mes, dia } = partesDaChave(chave);
  const data = new Date(Date.UTC(ano, mes - 1, dia) + dias * DIA_MS);
  return `${data.getUTCFullYear()}-${dois(data.getUTCMonth() + 1)}-${dois(data.getUTCDate())}`;
}

// 0 = segunda ... 6 = domingo
export function diaDaSemana(chave: string): number {
  const { ano, mes, dia } = partesDaChave(chave);
  return (new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay() + 6) % 7;
}

export function inicioDaSemana(chave: string): string {
  return somarDias(chave, -diaDaSemana(chave));
}

export function diasDaSemana(chave: string): string[] {
  const segunda = inicioDaSemana(chave);
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

// Da segunda 00:00 até a segunda seguinte 00:00 (exclusivo), em Recife
export function intervaloSemana(chave: string): { inicio: string; fim: string } {
  const segunda = inicioDaSemana(chave);
  return { inicio: inicioDoDia(segunda), fim: inicioDoDia(somarDias(segunda, 7)) };
}

export function intervaloDia(chave: string): { inicio: string; fim: string } {
  return { inicio: inicioDoDia(chave), fim: inicioDoDia(somarDias(chave, 1)) };
}

// "12 – 18 out 2026", "28 out – 3 nov 2026", "29 dez 2025 – 4 jan 2026"
export function formatarIntervaloSemana(chave: string): string {
  const inicio = partesDaChave(inicioDaSemana(chave));
  const fim = partesDaChave(somarDias(inicioDaSemana(chave), 6));
  const mesFim = MESES_CURTOS[fim.mes - 1];
  if (inicio.ano !== fim.ano) {
    return `${inicio.dia} ${MESES_CURTOS[inicio.mes - 1]} ${inicio.ano} – ${fim.dia} ${mesFim} ${fim.ano}`;
  }
  if (inicio.mes !== fim.mes) {
    return `${inicio.dia} ${MESES_CURTOS[inicio.mes - 1]} – ${fim.dia} ${mesFim} ${fim.ano}`;
  }
  return `${inicio.dia} – ${fim.dia} ${mesFim} ${fim.ano}`;
}

// "domingo, 8 nov 2026"
export function formatarDiaCabecalho(chave: string): string {
  const { ano, mes, dia } = partesDaChave(chave);
  return `${DIAS_LONGOS[diaDaSemana(chave)]}, ${dia} ${MESES_CURTOS[mes - 1]} ${ano}`;
}

// "novembro de 2026"
export function formatarMesAno(ano: number, mes: number): string {
  return `${MESES_LONGOS[mes - 1]} de ${ano}`;
}

export function numeroDoDia(chave: string): number {
  return partesDaChave(chave).dia;
}

// "14:00"
export function formatarHora(valor: string | Date): string {
  const { hora, minuto } = partesRecife(valor);
  return `${dois(hora)}:${dois(minuto)}`;
}

export function somarMinutos(iso: string, minutos: number): string {
  return new Date(new Date(iso).getTime() + minutos * MINUTO_MS).toISOString();
}

// "14:00 a 14:45"
export function formatarFaixaHorario(inicioIso: string, duracaoMin: number): string {
  return `${formatarHora(inicioIso)} a ${formatarHora(somarMinutos(inicioIso, duracaoMin))}`;
}

// "qui, 12 nov"
export function formatarDataCurta(valor: string | Date): string {
  const { dia, mes, diaSemana } = partesRecife(valor);
  return `${DIAS_CURTOS[diaSemana]}, ${dia} ${MESES_CURTOS[mes - 1]}`;
}

// "quinta-feira"
export function formatarDiaSemanaLongo(valor: string | Date): string {
  return DIAS_LONGOS[partesRecife(valor).diaSemana];
}

// "12 de novembro de 2026"
export function formatarDataLonga(valor: string | Date): string {
  const { dia, mes, ano } = partesRecife(valor);
  return `${dia} de ${MESES_LONGOS[mes - 1]} de ${ano}`;
}

// "quinta"
export function diaSemanaFala(valor: string | Date): string {
  return DIAS_FALA[partesRecife(valor).diaSemana];
}

// Minutos desde a meia-noite de Recife
export function minutosDoDia(valor: string | Date): number {
  const { hora, minuto } = partesRecife(valor);
  return hora * 60 + minuto;
}

// Campos dos inputs date/time ↔ ISO (sempre em Recife)
export function camposDeIso(iso: string): { data: string; hora: string } {
  const { hora, minuto } = partesRecife(iso);
  return { data: chaveDia(iso), hora: `${dois(hora)}:${dois(minuto)}` };
}

export function isoDeCampos(data: string, hora: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora)) return null;
  const { ano, mes, dia } = partesDaChave(data);
  const [h, m] = hora.split(":").map(Number);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || h > 23 || m > 59) return null;
  const iso = isoDeRecife(ano, mes, dia, h, m);
  // Rejeita datas que "transbordam" (31/02 vira 03/03)
  return chaveDia(iso) === data ? iso : null;
}

export function noPassado(iso: string, agora: Date = new Date()): boolean {
  return new Date(iso).getTime() <= agora.getTime();
}

// Dois intervalos [inicio, inicio + duração) se sobrepõem?
export function haSobreposicao(inicioA: string, duracaoA: number, inicioB: string, duracaoB: number): boolean {
  const a0 = new Date(inicioA).getTime();
  const b0 = new Date(inicioB).getTime();
  return a0 < b0 + duracaoB * MINUTO_MS && b0 < a0 + duracaoA * MINUTO_MS;
}

interface ReuniaoParaConflito {
  id: string;
  status: string;
  horarioConfirmado?: string;
  duracaoMin: number;
}

// Conflito = sobreposição com outra reunião CONFIRMADA do usuário. Só avisa,
// nunca bloqueia.
export function encontrarConflito<T extends ReuniaoParaConflito>(
  reunioes: T[],
  inicioIso: string,
  duracaoMin: number,
  ignorarId?: string,
): T | null {
  return (
    reunioes.find(
      (reuniao) =>
        reuniao.id !== ignorarId &&
        reuniao.status === "confirmada" &&
        reuniao.horarioConfirmado !== undefined &&
        haSobreposicao(inicioIso, duracaoMin, reuniao.horarioConfirmado, reuniao.duracaoMin),
    ) ?? null
  );
}

export interface PosicaoEvento {
  // Coluna do evento dentro do grupo de sobrepostos e total de colunas
  coluna: number;
  colunas: number;
}

// Eventos sobrepostos ficam lado a lado: cada grupo de eventos que se tocam
// divide a largura do dia em colunas (algoritmo guloso, como no Teams).
export function distribuirColunas(eventos: { chave: string; inicio: string; duracaoMin: number }[]) {
  const ordenados = [...eventos].sort(
    (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime() || b.duracaoMin - a.duracaoMin,
  );
  const resultado = new Map<string, PosicaoEvento>();
  let grupo: { chave: string; coluna: number }[] = [];
  let fimDoGrupo = -Infinity;
  let fimDasColunas: number[] = [];

  const fecharGrupo = () => {
    const colunas = fimDasColunas.length;
    for (const item of grupo) resultado.set(item.chave, { coluna: item.coluna, colunas });
    grupo = [];
    fimDasColunas = [];
  };

  for (const evento of ordenados) {
    const inicio = new Date(evento.inicio).getTime();
    const fim = inicio + evento.duracaoMin * MINUTO_MS;
    if (grupo.length > 0 && inicio >= fimDoGrupo) fecharGrupo();
    let coluna = fimDasColunas.findIndex((fimColuna) => fimColuna <= inicio);
    if (coluna === -1) {
      coluna = fimDasColunas.length;
      fimDasColunas.push(fim);
    } else {
      fimDasColunas[coluna] = fim;
    }
    grupo.push({ chave: evento.chave, coluna });
    fimDoGrupo = grupo.length === 1 ? fim : Math.max(fimDoGrupo, fim);
  }
  if (grupo.length > 0) fecharGrupo();
  return resultado;
}

// Semanas do mês (segunda a domingo) para o mini calendário; dias de fora do
// mês entram para completar as semanas
export function semanasDoMes(ano: number, mes: number): string[][] {
  const primeiro = `${ano}-${dois(mes)}-01`;
  let cursor = inicioDaSemana(primeiro);
  const semanas: string[][] = [];
  do {
    semanas.push(Array.from({ length: 7 }, (_, i) => somarDias(cursor, i)));
    cursor = somarDias(cursor, 7);
  } while (partesDaChave(cursor).mes === mes && partesDaChave(cursor).ano === ano);
  return semanas;
}

export function mesDaChave(chave: string): { ano: number; mes: number } {
  const { ano, mes } = partesDaChave(chave);
  return { ano, mes };
}

export function somarMeses(ano: number, mes: number, quantidade: number): { ano: number; mes: number } {
  const total = ano * 12 + (mes - 1) + quantidade;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}
