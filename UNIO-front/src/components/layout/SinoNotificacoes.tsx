import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  HeartHandshake,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useInteressesRecebidos } from "../../hooks/useInteressesRecebidos";
import { useSessaoReunioes } from "../../hooks/useReunioes";
import { listarPendentesDeAvaliacao } from "../../services/avaliacoesService";
import {
  chaveVisto,
  detalheInteresseRecebido,
  linkDoPerfil,
  mensagemErroRetribuir,
  textoInteresseRecebido,
} from "../../services/interessesRecebidos.mapping";
import { assinarReunioes, listarNotificacoes, marcarNotificacoesLidas } from "../../services/reunioesService";
import type { InteresseRecebido } from "../../types/interesses";
import type { NotificacaoReuniao, Reuniao, TipoNotificacao } from "../../types/reunioes";
import { linkMeusUnios } from "../../utils/rotasUnio";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import AvaliarReuniaoModal from "../reunioes/AvaliarReuniaoModal";
import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "../reunioes/estilos";

const ICONES: Record<TipoNotificacao, LucideIcon> = {
  recebida: CalendarClock,
  proposta: CalendarClock,
  aceita: CalendarCheck,
  recusada: CalendarX,
  cancelada: CalendarX,
  avaliar: Star,
};

const TITULO_SECAO = "px-4 pb-1 pt-3 text-xs font-semibold text-deepgreen/75";
const VAZIO = "px-4 pb-4 pt-1 text-sm text-deepgreen/75";

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

type Retorno =
  | { tipo: "match"; id: string; nome: string }
  | { tipo: "enviado"; nome: string }
  | { tipo: "erro"; id: string; texto: string };

// Sino das telas Descobrir, Investidores e Visão geral: interesses recebidos
// ainda não retribuídos (ADR-015), solicitações de reunião recebidas e
// respostas da outra parte (reunioesService)
export default function SinoNotificacoes({ className }: { className: string }) {
  const sessao = useSessaoReunioes();
  const interesses = useInteressesRecebidos();
  const id = useId();
  const refRaiz = useRef<HTMLDivElement>(null);
  const refBotao = useRef<HTMLButtonElement>(null);
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<NotificacaoReuniao[]>([]);
  const [versao, setVersao] = useState(0);
  const [avaliando, setAvaliando] = useState<Reuniao | null>(null);
  const [retribuindo, setRetribuindo] = useState<string | null>(null);
  const [retorno, setRetorno] = useState<Retorno | null>(null);
  // Interesses já vistos quando o sino abriu (os outros ficam destacados)
  const [vistosAoAbrir, setVistosAoAbrir] = useState<string[]>([]);
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

  const reunioesNaoLidas = notificacoes.filter((n) => !n.lida).length;
  const naoLidas = reunioesNaoLidas + interesses.naoVistos;

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
    if (!abrir) return;
    setRetorno(null);
    if (reunioesNaoLidas > 0) void marcarNotificacoesLidas(sessao);
    // Reabrir o sino busca a lista de novo; o que não tinha sido visto fica
    // destacado enquanto o sino está aberto
    setVistosAoAbrir(interesses.vistos);
    interesses.marcarVistos();
    interesses.recarregar();
  }

  async function retribuir(item: InteresseRecebido) {
    setRetribuindo(item.id);
    setRetorno(null);
    try {
      const status = await interesses.retribuir(item.id);
      setRetorno(status === "match" ? { tipo: "match", id: item.id, nome: item.nome } : { tipo: "enviado", nome: item.nome });
    } catch (erro) {
      const status = axios.isAxiosError(erro) ? erro.response?.status : undefined;
      setRetorno({ tipo: "erro", id: item.id, texto: mensagemErroRetribuir(status) });
      if (status === 404) interesses.recarregar();
    } finally {
      setRetribuindo(null);
    }
  }

  const itensInteresse = interesses.recebidos?.itens ?? [];
  const alemDaLista = interesses.recebidos ? interesses.recebidos.total - itensInteresse.length : 0;

  let secaoInteresses;
  if (interesses.carregando) {
    secaoInteresses = <p className={VAZIO}>Carregando interesses...</p>;
  } else if (interesses.erro) {
    secaoInteresses = (
      <div className={VAZIO}>
        <p>Não foi possível carregar os interesses recebidos.</p>
        <button type="button" onClick={interesses.recarregar} className={`${BOTAO_SECUNDARIO} mt-2`}>
          Tentar novamente
        </button>
      </div>
    );
  } else if (itensInteresse.length === 0) {
    secaoInteresses = <p className={VAZIO}>Nenhum interesse novo.</p>;
  } else {
    secaoInteresses = (
      <ul aria-labelledby={`${id}-interesses`}>
        {itensInteresse.map((item) => {
          const detalhe = detalheInteresseRecebido(item);
          const novo = !vistosAoAbrir.includes(chaveVisto(item));
          const ocupado = retribuindo === item.id;
          return (
            <li key={item.id} className={`px-4 py-3 ${novo ? "bg-sage/10" : ""}`}>
              <div className="flex gap-3 text-sm">
                <HeartHandshake size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <Link
                    to={linkDoPerfil(item)}
                    onClick={() => setAberto(false)}
                    className={`block rounded hover:underline ${FOCO_VISIVEL}`}
                  >
                    {textoInteresseRecebido(item)}
                  </Link>
                  <span className="block text-xs text-deepgreen/70">
                    {detalhe ? `${detalhe} · ` : ""}
                    {haQuanto(item.em)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void retribuir(item)}
                    disabled={retribuindo !== null}
                    aria-busy={ocupado}
                    aria-label={`Também tenho interesse em ${item.nome}`}
                    className={`${BOTAO_PRIMARIO} mt-2 w-full disabled:cursor-wait sm:w-auto`}
                  >
                    {ocupado ? "Enviando..." : "Também tenho interesse"}
                  </button>
                  {retorno?.tipo === "erro" && retorno.id === item.id && (
                    <p className="mt-1.5 text-xs text-red-700" role="alert">
                      {retorno.texto}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
        {alemDaLista > 0 && (
          <li className="px-4 pb-3 text-xs text-deepgreen/75">
            E mais {alemDaLista} {alemDaLista === 1 ? "interesse" : "interesses"}. Responda os mais recentes primeiro.
          </li>
        )}
      </ul>
    );
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
          <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
            {interesses.ativo && (
              <section className="border-b border-lightgray">
                <h2 id={`${id}-interesses`} className={TITULO_SECAO}>
                  Interesses recebidos
                </h2>
                <div aria-live="polite">
                  {retorno?.tipo === "match" && (
                    <p className="mx-4 mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-sage/40 px-3 py-2 text-sm font-semibold">
                      <Sparkles size={16} aria-hidden="true" />
                      Deu match com {retorno.nome}!
                      <Link
                        to={linkMeusUnios(retorno.id)}
                        onClick={() => setAberto(false)}
                        className={`rounded underline underline-offset-2 hover:no-underline ${FOCO_VISIVEL}`}
                      >
                        Veja em Meus unios
                      </Link>
                    </p>
                  )}
                  {retorno?.tipo === "enviado" && (
                    <p className="mx-4 mb-2 rounded-2xl bg-lightgray/70 px-3 py-2 text-sm">
                      Interesse enviado para {retorno.nome}. Esse perfil desfez o interesse antes, então o match ainda não
                      aconteceu.
                    </p>
                  )}
                </div>
                {secaoInteresses}
              </section>
            )}

            <section>
              <h2 className={TITULO_SECAO}>Reuniões</h2>
              {notificacoes.length === 0 ? (
                <p className={VAZIO}>Nenhuma notificação de reunião por enquanto.</p>
              ) : (
                <ul>
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
            </section>
          </div>
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
