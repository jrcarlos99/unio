import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, CalendarCheck, CalendarClock, CalendarX, Star, type LucideIcon } from "lucide-react";
import { useSessaoReunioes } from "../../hooks/useReunioes";
import { listarPendentesDeAvaliacao } from "../../services/avaliacoesService";
import { assinarReunioes, listarNotificacoes, marcarNotificacoesLidas } from "../../services/reunioesService";
import type { NotificacaoReuniao, Reuniao, TipoNotificacao } from "../../types/reunioes";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import AvaliarReuniaoModal from "../reunioes/AvaliarReuniaoModal";

const ICONES: Record<TipoNotificacao, LucideIcon> = {
  recebida: CalendarClock,
  proposta: CalendarClock,
  aceita: CalendarCheck,
  recusada: CalendarX,
  cancelada: CalendarX,
  avaliar: Star,
};

// "agora", "há 5 min", "há 2 h", "há 3 dias"
function haQuanto(iso: string, agora = Date.now()) {
  const minutos = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60_000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;
}

// Sino das telas Descobrir, Investidores e Visão geral: solicitações de
// reunião recebidas e respostas da outra parte (reunioesService)
export default function SinoNotificacoes({ className }: { className: string }) {
  const sessao = useSessaoReunioes();
  const id = useId();
  const refRaiz = useRef<HTMLDivElement>(null);
  const refBotao = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<NotificacaoReuniao[]>([]);
  const [versao, setVersao] = useState(0);
  const [avaliando, setAvaliando] = useState<Reuniao | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let ativo = true;
    listarNotificacoes(sessao)
      .then((lista) => {
        if (ativo) setNotificacoes(lista);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [sessao, versao]);

  useEffect(() => assinarReunioes(() => setVersao((v) => v + 1)), []);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    const aoClicar = (event: MouseEvent) => {
      if (!refRaiz.current?.contains(event.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, [aberto]);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  // "Avalie a reunião com...": abre o modal aqui mesmo. Se já foi avaliada
  // (ou não está mais realizada), leva ao detalhe da reunião.
  async function abrirAvaliacao(notificacao: NotificacaoReuniao) {
    setAberto(false);
    try {
      const pendente = (await listarPendentesDeAvaliacao(sessao)).find((r) => r.id === notificacao.reuniaoId);
      if (pendente) {
        setAvaliando(pendente);
        return;
      }
    } catch {
      // segue para o detalhe
    }
    navigate(`/reunioes?reuniao=${encodeURIComponent(notificacao.reuniaoId)}`);
  }

  function alternar() {
    const abrir = !aberto;
    setAberto(abrir);
    if (abrir && naoLidas > 0) void marcarNotificacoesLidas(sessao);
  }

  return (
    <div
      ref={refRaiz}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && aberto) {
          event.stopPropagation();
          setAberto(false);
          refBotao.current?.focus();
        }
      }}
    >
      <button
        ref={refBotao}
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls={id}
        aria-label={naoLidas > 0 ? `Notificações (${naoLidas} novas)` : "Notificações"}
        className={className}
      >
        <Bell size={18} aria-hidden="true" />
        {naoLidas > 0 && (
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" aria-hidden="true" />
        )}
      </button>
      {aberto && (
        <div
          id={id}
          className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-lightgray bg-white text-deepgreen shadow-soft-lg"
        >
          <p className="border-b border-lightgray px-4 py-3 text-sm font-bold">Notificações</p>
          {notificacoes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-deepgreen/75">Nenhuma notificação por enquanto.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {notificacoes.slice(0, 8).map((notificacao) => {
                const Icone = ICONES[notificacao.tipo] ?? CalendarClock;
                const classe = `flex w-full gap-3 px-4 py-3 text-left text-sm hover:bg-lightgray/40 ${FOCO_VISIVEL} focus-visible:ring-inset ${
                  notificacao.lida ? "" : "bg-sage/10"
                }`;
                const conteudo = (
                  <>
                    <Icone size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block">{notificacao.texto}</span>
                      <span className="block text-xs text-deepgreen/70">{haQuanto(notificacao.em)}</span>
                    </span>
                  </>
                );
                return (
                  <li key={notificacao.id}>
                    {notificacao.tipo === "avaliar" ? (
                      <button type="button" onClick={() => void abrirAvaliacao(notificacao)} className={classe}>
                        {conteudo}
                      </button>
                    ) : (
                      <Link
                        to={`/reunioes?reuniao=${encodeURIComponent(notificacao.reuniaoId)}`}
                        onClick={() => setAberto(false)}
                        className={classe}
                      >
                        {conteudo}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            to="/reunioes"
            onClick={() => setAberto(false)}
            className={`block border-t border-lightgray px-4 py-3 text-center text-sm font-semibold hover:bg-lightgray/40 ${FOCO_VISIVEL} focus-visible:ring-inset`}
          >
            Ver reuniões
          </Link>
        </div>
      )}
      {avaliando && <AvaliarReuniaoModal sessao={sessao} reuniao={avaliando} onFechar={() => setAvaliando(null)} />}
    </div>
  );
}
