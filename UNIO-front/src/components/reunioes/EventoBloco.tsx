import type { CSSProperties } from "react";
import { CircleCheck, MapPin, Video } from "lucide-react";
import type { Reuniao } from "../../types/reunioes";
import { formatarFaixaHorario } from "../../utils/datas";
import { aguardandoPresenca, descreverEvento, tituloReuniao, tooltipEvento } from "../../utils/reunioes";

interface EventoBlocoProps {
  reuniao: Reuniao;
  // Horário deste bloco (o confirmado ou um dos sugeridos)
  inicio: string;
  estilo: CSSProperties;
  // Altura em px, para decidir o que cabe
  altura: number;
  dia: string;
  onAbrir: () => void;
}

// Bloco de uma reunião na grade. Confirmada: verde profundo com texto
// branco (com um ponto de atenção quando já terminou e falta dizer se
// aconteceu). Realizada: branco com borda verde e selo "Realizada".
// Pendente: sálvia claro, borda tracejada e "Aguardando confirmação".
export default function EventoBloco({ reuniao, inicio, estilo, altura, dia, onAbrir }: EventoBlocoProps) {
  const realizada = reuniao.status === "realizada";
  const confirmada = reuniao.status === "confirmada";
  const presenca = aguardandoPresenca(reuniao);
  const Icone = reuniao.formato === "presencial" ? MapPin : Video;
  const rotuloFormato = reuniao.formato === "presencial" ? "Presencial" : "Online";
  const titulo = tituloReuniao(reuniao);

  return (
    <button
      type="button"
      onClick={onAbrir}
      data-evento=""
      data-dia={dia}
      title={tooltipEvento(reuniao, inicio)}
      aria-label={descreverEvento(reuniao, inicio)}
      style={estilo}
      className={`absolute z-10 flex min-w-[44px] flex-col overflow-hidden rounded-lg px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition hover:z-20 hover:shadow-soft focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deepgreen focus-visible:ring-offset-1 ${
        realizada
          ? "border-2 border-deepgreen bg-white text-deepgreen hover:bg-lightgray/40"
          : confirmada
            ? "bg-deepgreen text-white hover:bg-deepgreen/90"
            : "border-2 border-dashed border-sage bg-sage/20 text-deepgreen hover:bg-sage/30"
      }`}
    >
      {presenca && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-white"
        />
      )}
      <span className="flex min-w-0 items-center gap-1">
        <Icone size={11} className="shrink-0" role="img" aria-label={rotuloFormato} />
        <span className={`truncate font-bold ${presenca ? "pr-3" : ""}`}>{titulo}</span>
      </span>
      {altura >= 40 && (
        <span className={`truncate ${confirmada ? "text-white/80" : "text-deepgreen/80"}`}>
          {formatarFaixaHorario(inicio, reuniao.duracaoMin)}
        </span>
      )}
      {realizada && altura >= 56 && (
        <span className="mt-0.5 inline-flex items-center gap-0.5 self-start truncate rounded bg-deepgreen px-1 text-[10px] font-semibold text-white">
          <CircleCheck size={10} aria-hidden="true" />
          Realizada
        </span>
      )}
      {presenca && altura >= 56 && (
        <span className="mt-0.5 self-start truncate rounded bg-white/90 px-1 text-[10px] font-semibold text-deepgreen">
          Aconteceu?
        </span>
      )}
      {!confirmada && !realizada && altura >= 56 && (
        <span className="mt-0.5 self-start truncate rounded bg-white/80 px-1 text-[10px] font-semibold text-deepgreen">
          Aguardando confirmação
        </span>
      )}
    </button>
  );
}
