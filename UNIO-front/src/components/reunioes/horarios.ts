import { MAX_HORARIOS_SUGERIDOS } from "../../types/reunioes";
import { camposDeIso, hojeChave, isoDeCampos, noPassado, somarDias, somarMinutos } from "../../utils/datas";

// Linhas do SeletorHorarios (data e hora como nos inputs, sempre em Recife)

export interface LinhaHorario {
  id: string;
  data: string;
  hora: string;
}

let contador = 0;
function novoId() {
  contador += 1;
  return `horario-${contador}`;
}

export function criarLinha(iso?: string): LinhaHorario {
  if (iso) return { id: novoId(), ...camposDeIso(iso) };
  return { id: novoId(), data: somarDias(hojeChave(), 1), hora: "10:00" };
}

// Próxima linha: uma hora depois da última (ou amanhã às 10:00)
export function proximaLinha(linhas: LinhaHorario[]): LinhaHorario {
  const ultima = linhas[linhas.length - 1];
  const iso = ultima ? isoDeCampos(ultima.data, ultima.hora) : null;
  return iso ? criarLinha(somarMinutos(iso, 60)) : criarLinha();
}

export function isoDaLinha(linha: LinhaHorario): string | null {
  return isoDeCampos(linha.data, linha.hora);
}

// Erro por linha (id → mensagem); vazio = tudo certo
export function validarLinhas(linhas: LinhaHorario[], agora: Date = new Date()): Record<string, string> {
  const erros: Record<string, string> = {};
  const vistos = new Set<string>();
  for (const linha of linhas.slice(0, MAX_HORARIOS_SUGERIDOS)) {
    const iso = isoDaLinha(linha);
    if (!linha.data || !linha.hora) erros[linha.id] = "Informe a data e a hora.";
    else if (!iso) erros[linha.id] = "Data ou hora inválida.";
    else if (noPassado(iso, agora)) erros[linha.id] = "Escolha um horário no futuro.";
    else if (vistos.has(iso)) erros[linha.id] = "Este horário já foi sugerido.";
    if (iso) vistos.add(iso);
  }
  return erros;
}
