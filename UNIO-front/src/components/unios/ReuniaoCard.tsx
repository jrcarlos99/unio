import { CalendarDays, CalendarPlus, Download, MessageCircle } from "lucide-react";
import type { Contato } from "../../types/contato";
import type { Reuniao } from "../../types/reunioes";
import { formatarDataCurta, formatarFaixaHorario } from "../../utils/datas";
import { linkWhatsApp } from "../../utils/contato";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import { BOTAO_LINK } from "./ContatoCard";

interface ReuniaoCardProps {
  nome: string;
  meuNome: string;
  contato: Contato;
  // Próxima reunião confirmada com este unio (atalho para o .ics)
  proximaConfirmada: Reuniao | null;
  onSolicitar: () => void;
  onBaixarIcs: (reuniao: Reuniao) => void;
  onAbrirWhatsApp: () => void;
}

// "Marcar reunião": abre o modal "Solicitar reunião" com este unio já
// escolhido. A reunião confirmada vai para o calendário pelo .ics; o
// WhatsApp continua como contato direto.
export default function ReuniaoCard({
  nome,
  meuNome,
  contato,
  proximaConfirmada,
  onSolicitar,
  onBaixarIcs,
  onAbrirWhatsApp,
}: ReuniaoCardProps) {
  const whatsapp = contato.whatsapp
    ? linkWhatsApp(
        contato.whatsapp,
        `Olá, ${nome}! Aqui é ${meuNome} (UNIO). Que tal marcarmos uma reunião para conversar sobre o nosso match? Qual dia e horário ficam bons para você?`,
      )
    : null;

  return (
    <section aria-labelledby="titulo-reuniao" className="flex flex-col rounded-2xl border border-lightgray p-4">
      <h3 id="titulo-reuniao" className="flex items-center gap-2 font-bold text-deepgreen">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sage/30" aria-hidden="true">
          <CalendarDays size={16} />
        </span>
        Marcar reunião
      </h3>
      <p className="mt-2 text-sm text-deepgreen/80">Proponha até 3 horários e {nome} escolhe um.</p>
      {proximaConfirmada?.horarioConfirmado && (
        <div className="mt-3 rounded-xl bg-sage/15 px-3 py-2 text-sm text-deepgreen">
          <p className="text-xs text-deepgreen/75">Próxima reunião confirmada</p>
          <p className="font-semibold capitalize">
            {formatarDataCurta(proximaConfirmada.horarioConfirmado)},{" "}
            {formatarFaixaHorario(proximaConfirmada.horarioConfirmado, proximaConfirmada.duracaoMin)}
          </p>
          <button
            type="button"
            onClick={() => onBaixarIcs(proximaConfirmada)}
            className={`mt-1 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg text-sm font-semibold hover:underline ${FOCO_VISIVEL}`}
          >
            <Download size={14} aria-hidden="true" />
            Baixar .ics
          </button>
        </div>
      )}
      <div className="mt-auto space-y-2 pt-4">
        <button
          type="button"
          onClick={onSolicitar}
          className={`${BOTAO_LINK} bg-deepgreen text-white hover:bg-sage hover:text-deepgreen`}
        >
          <CalendarPlus size={16} aria-hidden="true" />
          Solicitar reunião
        </button>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onAbrirWhatsApp}
            className={`${BOTAO_LINK} border border-lightgray bg-white text-deepgreen hover:border-sage`}
          >
            <MessageCircle size={16} aria-hidden="true" />
            Combinar pelo WhatsApp
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        )}
      </div>
    </section>
  );
}
