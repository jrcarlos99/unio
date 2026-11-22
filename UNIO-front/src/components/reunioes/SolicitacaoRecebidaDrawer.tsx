import { useCallback, useId, useMemo, useState } from "react";
import { CalendarCheck, MapPin, Video } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import {
  detectarConflito,
  responderSolicitacao,
  type SessaoReunioes,
} from "../../services/reunioesService";
import type { Reuniao } from "../../types/reunioes";
import { formatarDataCurta, formatarFaixaHorario, noPassado } from "../../utils/datas";
import { navegarRadioPorTeclado, tabIndexRadio } from "../onboarding/selecao";
import CartaoContraparte from "./CartaoContraparte";
import { ConfirmacaoInline } from "./Comuns";
import { BOTAO_PERIGO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO } from "./estilos";
import { criarLinha, isoDaLinha, validarLinhas, type LinhaHorario } from "./horarios";
import PainelLateral from "./PainelLateral";
import SeletorHorarios from "./SeletorHorarios";

interface SolicitacaoRecebidaDrawerProps {
  sessao: SessaoReunioes;
  reuniao: Reuniao;
  onFechar: () => void;
}

type Modo = "escolher" | "propor" | "recusar";

// Solicitação recebida: quem pediu, assunto, mensagem e os horários
// sugeridos (seleção única). Aceitar, propor outros horários ou recusar.
export default function SolicitacaoRecebidaDrawer({ sessao, reuniao, onFechar }: SolicitacaoRecebidaDrawerProps) {
  const { mostrar } = useToast();
  const id = useId();
  const nome = reuniao.contraparte.nome;

  const opcoes = useMemo(
    () =>
      reuniao.horariosSugeridos.map((iso) => ({
        iso,
        passado: noPassado(iso),
        conflito: detectarConflito(sessao, iso, reuniao.duracaoMin, reuniao.id),
      })),
    [sessao, reuniao],
  );
  // "SUGERIDO" = primeiro horário livre (e futuro), já pré-selecionado
  const sugerido = opcoes.find((opcao) => !opcao.passado && !opcao.conflito)?.iso ?? null;

  const [escolhido, setEscolhido] = useState<string | null>(
    sugerido ?? opcoes.find((opcao) => !opcao.passado)?.iso ?? null,
  );
  const [modo, setModo] = useState<Modo>("escolher");
  const [linhas, setLinhas] = useState<LinhaHorario[]>(() => [criarLinha()]);
  const [errosHorarios, setErrosHorarios] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);

  const conflitoDe = useCallback(
    (iso: string) => detectarConflito(sessao, iso, reuniao.duracaoMin, reuniao.id),
    [sessao, reuniao],
  );

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    setOcupado(true);
    try {
      await acao();
      mostrar(sucesso, "sucesso");
      onFechar();
    } catch (erro) {
      mostrar(erro instanceof Error ? erro.message : "Não foi possível concluir. Tente novamente.", "erro");
      setOcupado(false);
    }
  }

  function aceitar() {
    if (!escolhido) return;
    void executar(
      () => responderSolicitacao(sessao, reuniao.id, { acao: "aceitar", horario: escolhido }),
      `Reunião com ${nome} confirmada para ${formatarDataCurta(escolhido)}, ${formatarFaixaHorario(escolhido, reuniao.duracaoMin)}.`,
    );
  }

  function enviarProposta() {
    const erros = validarLinhas(linhas);
    setErrosHorarios(erros);
    if (Object.keys(erros).length > 0) return;
    const novosHorarios = linhas.map(isoDaLinha).filter((iso): iso is string => iso !== null);
    void executar(
      () => responderSolicitacao(sessao, reuniao.id, { acao: "propor", novosHorarios }),
      `Novos horários enviados para ${nome}.`,
    );
  }

  const IconeFormato = reuniao.formato === "presencial" ? MapPin : Video;
  const descricao = reuniao.mensagem || reuniao.pauta;
  const algumDisponivel = opcoes.some((opcao) => !opcao.passado);

  const rodape =
    modo === "propor" ? (
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={() => setModo("escolher")} disabled={ocupado} className={BOTAO_SECUNDARIO}>
          Voltar
        </button>
        <button type="button" onClick={enviarProposta} disabled={ocupado} aria-busy={ocupado} className={BOTAO_PRIMARIO}>
          {ocupado ? "Enviando..." : "Enviar novos horários"}
        </button>
      </div>
    ) : modo === "recusar" ? (
      <ConfirmacaoInline
        titulo={`Recusar a solicitação de ${nome}?`}
        texto="Quem solicitou será avisado. Vocês continuam sendo unios."
        rotuloConfirmar="Recusar solicitação"
        rotuloOcupado="Recusando..."
        ocupado={ocupado}
        onCancelar={() => setModo("escolher")}
        onConfirmar={() =>
          executar(() => responderSolicitacao(sessao, reuniao.id, { acao: "recusar" }), `Solicitação de ${nome} recusada.`)
        }
      />
    ) : (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={aceitar}
          disabled={!escolhido || ocupado}
          aria-busy={ocupado}
          className={`${BOTAO_PRIMARIO} w-full`}
        >
          <CalendarCheck size={16} aria-hidden="true" />
          {ocupado ? "Confirmando..." : "Aceitar horário"}
        </button>
        <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
          <button type="button" onClick={() => setModo("propor")} className={BOTAO_SECUNDARIO}>
            Propor outros horários
          </button>
          <button type="button" onClick={() => setModo("recusar")} className={BOTAO_PERIGO}>
            Recusar solicitação
          </button>
        </div>
      </div>
    );

  return (
    <PainelLateral titulo="Solicitação de reunião" linhaApoio="Recebida via UNIO" onFechar={onFechar} rodape={rodape}>
      <CartaoContraparte contraparte={reuniao.contraparte} rotuloPerfil="Ver perfil completo" onNavegar={onFechar} />

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="col-span-2">
          <dt className="text-xs text-deepgreen/75">Assunto</dt>
          <dd className="font-bold">{reuniao.assunto}</dd>
        </div>
        <div>
          <dt className="text-xs text-deepgreen/75">Duração</dt>
          <dd className="font-semibold">{reuniao.duracaoMin} min</dd>
        </div>
        <div>
          <dt className="text-xs text-deepgreen/75">Formato</dt>
          <dd className="flex items-center gap-1.5 font-semibold">
            <IconeFormato size={14} aria-hidden="true" />
            {reuniao.formato === "presencial" ? "Presencial no Recife" : "Online"}
          </dd>
        </div>
        {reuniao.local && (
          <div className="col-span-2">
            <dt className="text-xs text-deepgreen/75">Local sugerido</dt>
            <dd className="font-semibold">{reuniao.local.nome}</dd>
          </div>
        )}
      </dl>

      {descricao && (
        <blockquote className="mt-4 rounded-2xl bg-lightgray/50 px-4 py-3 text-sm italic">“{descricao}”</blockquote>
      )}

      {modo === "propor" ? (
        <section aria-labelledby={`${id}-propor`} className="mt-6">
          <h3 id={`${id}-propor`} className="font-bold">
            Propor outros horários
          </h3>
          <p className="mb-3 mt-1 text-xs text-deepgreen/75">
            Sugira até 3 opções. A solicitação volta para {nome} responder. Horário de Brasília (GMT-3).
          </p>
          <SeletorHorarios
            idBase={`${id}-novos`}
            linhas={linhas}
            onAlterar={(novas) => {
              setLinhas(novas);
              if (Object.keys(errosHorarios).length > 0) setErrosHorarios(validarLinhas(novas));
            }}
            erros={errosHorarios}
            conflitoDe={conflitoDe}
          />
        </section>
      ) : (
        <section aria-labelledby={`${id}-escolha`} className="mt-6">
          <h3 id={`${id}-escolha`} className="font-bold">
            Escolha um horário
          </h3>
          <p className="mt-1 text-xs text-deepgreen/75">Quem solicitou sugeriu até 3 opções de agenda.</p>
          <div
            role="radiogroup"
            aria-labelledby={`${id}-escolha`}
            onKeyDown={navegarRadioPorTeclado}
            className="mt-3 space-y-2"
          >
            {opcoes.map((opcao, indice) => {
              const selecionado = escolhido === opcao.iso;
              return (
                <div
                  key={opcao.iso}
                  role="radio"
                  aria-checked={selecionado}
                  aria-disabled={opcao.passado}
                  tabIndex={opcao.passado ? -1 : tabIndexRadio(selecionado, indice, escolhido !== null)}
                  onClick={() => !opcao.passado && setEscolhido(opcao.iso)}
                  onKeyDown={(event) => {
                    if ((event.key === " " || event.key === "Enter") && !opcao.passado) {
                      event.preventDefault();
                      setEscolhido(opcao.iso);
                    }
                  }}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deepgreen focus-visible:ring-offset-2 ${
                    opcao.passado
                      ? "cursor-not-allowed border-lightgray opacity-60"
                      : selecionado
                        ? "border-deepgreen bg-sage/15"
                        : "border-lightgray hover:border-sage"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      selecionado ? "border-deepgreen" : "border-deepgreen/40"
                    }`}
                  >
                    {selecionado && <span className="h-2.5 w-2.5 rounded-full bg-deepgreen" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold capitalize">{formatarDataCurta(opcao.iso)}</span>
                      {opcao.iso === sugerido && (
                        <span className="rounded-full bg-deepgreen px-2 py-0.5 text-[10px] font-bold tracking-wider text-white">
                          SUGERIDO
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm">
                      {formatarFaixaHorario(opcao.iso, reuniao.duracaoMin)}{" "}
                      <span className="text-xs text-deepgreen/70">GMT-3</span>
                    </span>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                        opcao.passado
                          ? "bg-lightgray text-deepgreen/80"
                          : opcao.conflito
                            ? "bg-amber-50 text-amber-900"
                            : "bg-sage/25 text-deepgreen"
                      }`}
                    >
                      {opcao.passado
                        ? "Horário já passou"
                        : opcao.conflito
                          ? "Conflito com outra reunião"
                          : "Livre na sua agenda"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          {!algumDisponivel && (
            <p className="mt-3 text-sm text-deepgreen/80">
              Todos os horários sugeridos já passaram. Proponha outros horários para {nome}.
            </p>
          )}
        </section>
      )}
    </PainelLateral>
  );
}
