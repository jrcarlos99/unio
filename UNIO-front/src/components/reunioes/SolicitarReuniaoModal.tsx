import { useCallback, useId, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Info, MapPin, Video, X } from "lucide-react";
import { useCarregamento } from "../../hooks/useDescoberta";
import { useDialogo } from "../../hooks/useDialogo";
import { useToast } from "../../hooks/useToast";
import { detectarConflito, listarContrapartes, solicitarReuniao, type SessaoReunioes } from "../../services/reunioesService";
import {
  ASSUNTOS_REUNIAO,
  DURACOES_REUNIAO,
  MAX_CARACTERES_MENSAGEM,
  type AssuntoReuniao,
  type DuracaoReuniao,
  type FormatoReuniao,
} from "../../types/reunioes";
import { validarLinkHttps } from "../../utils/reunioes";
import { AvatarReuniao } from "./Comuns";
import { BOTAO_ICONE, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, CHIP, ERRO, ROTULO } from "./estilos";
import { criarLinha, isoDaLinha, validarLinhas, type LinhaHorario } from "./horarios";
import SeletorHorarios from "./SeletorHorarios";

interface SolicitarReuniaoModalProps {
  sessao: SessaoReunioes;
  // Unio já escolhido (popup do unio)
  unioInicial?: string;
  // Primeiro horário já preenchido (clique numa célula do calendário)
  horarioInicial?: string;
  onFechar: () => void;
}

const TEXTOS = {
  investidor: {
    subtitulo: "Envie uma proposta de agenda direta com startups conectadas",
    placeholder: "Escreva uma mensagem ou pauta breve para o fundador...",
    vazio: "Você ainda não deu match com nenhuma startup.",
  },
  startup: {
    subtitulo: "Envie uma proposta de agenda direta com investidores conectados",
    placeholder: "Escreva uma mensagem ou pauta breve para o investidor...",
    vazio: "Você ainda não deu match com nenhum investidor.",
  },
};

type CampoErro = "unio" | "assunto" | "link";

// Modal (bottom sheet no mobile) para propor até 3 horários a um unio
export default function SolicitarReuniaoModal({ sessao, unioInicial, horarioInicial, onFechar }: SolicitarReuniaoModalProps) {
  const textos = TEXTOS[sessao.perfil];
  const { mostrar } = useToast();
  const id = useId();
  const refTitulo = useRef<HTMLHeadingElement>(null);
  const { refPainel, aoTeclar } = useDialogo(onFechar, refTitulo);

  const carregar = useCallback(() => listarContrapartes(sessao), [sessao]);
  const { carregando, dados: contrapartes } = useCarregamento(carregar, "Não foi possível carregar seus unios.");

  const [unioId, setUnioId] = useState(unioInicial ?? "");
  const [assunto, setAssunto] = useState<AssuntoReuniao | "">("");
  const [duracao, setDuracao] = useState<DuracaoReuniao>(30);
  const [formato, setFormato] = useState<FormatoReuniao>("online");
  const [linhas, setLinhas] = useState<LinhaHorario[]>(() => [criarLinha(horarioInicial)]);
  const [mensagem, setMensagem] = useState("");
  const [link, setLink] = useState("");
  const [local, setLocal] = useState("");
  const [erros, setErros] = useState<Partial<Record<CampoErro, string>>>({});
  const [errosHorarios, setErrosHorarios] = useState<Record<string, string>>({});
  const [tentouEnviar, setTentouEnviar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const conflitoDe = useCallback((iso: string) => detectarConflito(sessao, iso, duracao), [sessao, duracao]);

  function alterarLinhas(novas: LinhaHorario[]) {
    setLinhas(novas);
    if (tentouEnviar) setErrosHorarios(validarLinhas(novas));
  }

  function validar() {
    const novos: Partial<Record<CampoErro, string>> = {};
    if (!unioId) novos.unio = "Escolha com quem será a reunião.";
    if (!assunto) novos.assunto = "Escolha o assunto.";
    if (formato === "online" && link.trim() && !validarLinkHttps(link)) {
      novos.link = "Informe um link que comece com https://";
    }
    return novos;
  }

  function focarPrimeiroErro(novos: Partial<Record<CampoErro, string>>, horarios: Record<string, string>) {
    const painel = refPainel.current;
    if (!painel) return;
    const linhaComErro = linhas.find((linha) => horarios[linha.id]);
    const seletor = novos.unio
      ? `input[name="${id}-unio"]`
      : novos.assunto
        ? `input[name="${id}-assunto"]`
        : linhaComErro
          ? `[data-campo-horario="${linhaComErro.id}"]`
          : novos.link
            ? `#${CSS.escape(`${id}-link`)}`
            : null;
    if (seletor) painel.querySelector<HTMLElement>(seletor)?.focus();
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    setTentouEnviar(true);
    const novos = validar();
    const horarios = validarLinhas(linhas);
    setErros(novos);
    setErrosHorarios(horarios);
    if (Object.keys(novos).length > 0 || Object.keys(horarios).length > 0) {
      focarPrimeiroErro(novos, horarios);
      return;
    }
    const contraparte = contrapartes?.find((item) => item.id === unioId);
    setEnviando(true);
    try {
      await solicitarReuniao(sessao, {
        unioId,
        assunto: assunto as AssuntoReuniao,
        duracaoMin: duracao,
        formato,
        horarios: linhas.map(isoDaLinha).filter((iso): iso is string => iso !== null),
        mensagem: mensagem.trim() || undefined,
        link: formato === "online" ? link.trim() || undefined : undefined,
        local: formato === "presencial" && local.trim() ? { nome: local.trim(), endereco: local.trim() } : undefined,
      });
      mostrar(`Solicitação enviada para ${contraparte?.nome ?? "seu unio"}.`, "sucesso");
      onFechar();
    } catch (erro) {
      mostrar(erro instanceof Error ? erro.message : "Não foi possível enviar a solicitação.", "erro");
      setEnviando(false);
    }
  }

  function aoClicarFundo(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (event.target === event.currentTarget) onFechar();
  }

  const semUnios = !carregando && (!contrapartes || contrapartes.length === 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[47] flex items-end justify-center bg-deepgreen/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={aoClicarFundo}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div
        ref={refPainel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        aria-describedby={`${id}-subtitulo`}
        onKeyDown={aoTeclar}
        className="flex max-h-[94vh] w-full animate-fade-in flex-col overflow-hidden rounded-t-3xl bg-white font-jakarta text-deepgreen shadow-soft-lg sm:max-h-[90vh] sm:max-w-[620px] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-lightgray px-5 py-4 sm:px-6">
          <div>
            <h2 id={`${id}-titulo`} ref={refTitulo} tabIndex={-1} className="text-xl font-bold focus:outline-none">
              Solicitar reunião
            </h2>
            <p id={`${id}-subtitulo`} className="mt-0.5 text-sm text-deepgreen/75">
              {textos.subtitulo}
            </p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className={BOTAO_ICONE}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
            {/* Com quem */}
            <fieldset>
              <legend className={ROTULO}>Com quem</legend>
              {carregando ? (
                <div className="mt-2 h-16 animate-pulse rounded-2xl bg-lightgray" aria-hidden="true" />
              ) : semUnios ? (
                <p className="mt-2 rounded-2xl bg-lightgray/50 p-4 text-sm">
                  {textos.vazio}{" "}
                  <Link to="/meus-unios" onClick={onFechar} className="font-semibold underline">
                    Ver Meus unios
                  </Link>
                </p>
              ) : (
                <div className="mt-2 grid max-h-56 grid-cols-1 gap-2 overflow-y-auto p-0.5 sm:grid-cols-2">
                  {contrapartes?.map((contraparte) => {
                    const ativo = unioId === contraparte.id;
                    return (
                      <label key={contraparte.id} className="relative block cursor-pointer">
                        <input
                          type="radio"
                          name={`${id}-unio`}
                          value={contraparte.id}
                          checked={ativo}
                          onChange={() => {
                            setUnioId(contraparte.id);
                            setErros((atual) => ({ ...atual, unio: undefined }));
                          }}
                          aria-describedby={erros.unio ? `${id}-erro-unio` : undefined}
                          className="peer sr-only"
                        />
                        <span
                          className={`flex items-center gap-3 rounded-2xl border p-3 transition peer-focus-visible:ring-2 peer-focus-visible:ring-deepgreen peer-focus-visible:ring-offset-2 ${
                            ativo ? "border-deepgreen bg-sage/15" : "border-lightgray hover:border-sage"
                          }`}
                        >
                          <AvatarReuniao iniciais={contraparte.iniciais} tamanho="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{contraparte.nome}</span>
                            <span className="block truncate text-xs text-deepgreen/75">{contraparte.subtitulo}</span>
                          </span>
                          <span className="shrink-0 rounded-full bg-sage/30 px-2 py-0.5 text-xs font-bold">
                            {contraparte.matchPercentual}%<span className="sr-only"> de match</span>
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {erros.unio && (
                <p id={`${id}-erro-unio`} className={ERRO}>
                  {erros.unio}
                </p>
              )}
            </fieldset>

            {/* Assunto */}
            <fieldset>
              <legend className={ROTULO}>Assunto</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {ASSUNTOS_REUNIAO.map((opcao) => (
                  <label key={opcao}>
                    <input
                      type="radio"
                      name={`${id}-assunto`}
                      value={opcao}
                      checked={assunto === opcao}
                      onChange={() => {
                        setAssunto(opcao);
                        setErros((atual) => ({ ...atual, assunto: undefined }));
                      }}
                      aria-describedby={erros.assunto ? `${id}-erro-assunto` : undefined}
                      className="peer sr-only"
                    />
                    <span className={CHIP(assunto === opcao)}>{opcao}</span>
                  </label>
                ))}
              </div>
              {erros.assunto && (
                <p id={`${id}-erro-assunto`} className={ERRO}>
                  {erros.assunto}
                </p>
              )}
            </fieldset>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Duração */}
              <fieldset>
                <legend className={ROTULO}>Duração</legend>
                <div className="mt-2 flex gap-2">
                  {DURACOES_REUNIAO.map((opcao) => (
                    <label key={opcao}>
                      <input
                        type="radio"
                        name={`${id}-duracao`}
                        value={opcao}
                        checked={duracao === opcao}
                        onChange={() => setDuracao(opcao)}
                        className="peer sr-only"
                      />
                      <span className={CHIP(duracao === opcao)}>{opcao} min</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* Formato */}
              <fieldset>
                <legend className={ROTULO}>Formato</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      { valor: "online", rotulo: "Online", icone: Video },
                      { valor: "presencial", rotulo: "Presencial no Recife", icone: MapPin },
                    ] as const
                  ).map(({ valor, rotulo, icone: Icone }) => (
                    <label key={valor}>
                      <input
                        type="radio"
                        name={`${id}-formato`}
                        value={valor}
                        checked={formato === valor}
                        onChange={() => setFormato(valor)}
                        className="peer sr-only"
                      />
                      <span className={CHIP(formato === valor)}>
                        <Icone size={14} aria-hidden="true" />
                        {rotulo}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            {formato === "online" ? (
              <div>
                <label htmlFor={`${id}-link`} className={ROTULO}>
                  Link da reunião <span className="font-normal text-deepgreen/75">(opcional)</span>
                </label>
                <input
                  id={`${id}-link`}
                  type="url"
                  inputMode="url"
                  value={link}
                  placeholder="https://meet.google.com/..."
                  onChange={(event) => {
                    setLink(event.target.value);
                    if (erros.link) setErros((atual) => ({ ...atual, link: undefined }));
                  }}
                  aria-invalid={Boolean(erros.link)}
                  aria-describedby={erros.link ? `${id}-erro-link` : undefined}
                  className={`${CAMPO(Boolean(erros.link))} mt-1.5`}
                />
                {erros.link && (
                  <p id={`${id}-erro-link`} className={ERRO}>
                    {erros.link}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor={`${id}-local`} className={ROTULO}>
                  Local sugerido <span className="font-normal text-deepgreen/75">(opcional)</span>
                </label>
                <input
                  id={`${id}-local`}
                  type="text"
                  value={local}
                  maxLength={160}
                  placeholder="Ex.: Porto Digital, Bairro do Recife"
                  onChange={(event) => setLocal(event.target.value)}
                  className={`${CAMPO()} mt-1.5`}
                />
              </div>
            )}

            {/* Horários */}
            <fieldset>
              <legend className={ROTULO}>Horários sugeridos</legend>
              <p className="mb-2 text-xs text-deepgreen/75">
                Sugira até 3 opções. Horário de Brasília (GMT-3).
              </p>
              <SeletorHorarios
                idBase={`${id}-horarios`}
                linhas={linhas}
                onAlterar={alterarLinhas}
                erros={errosHorarios}
                conflitoDe={conflitoDe}
              />
            </fieldset>

            {/* Mensagem */}
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={`${id}-mensagem`} className={ROTULO}>
                  Mensagem <span className="font-normal text-deepgreen/75">(opcional)</span>
                </label>
                <span id={`${id}-contador`} className="text-xs text-deepgreen/75" aria-live="polite">
                  {mensagem.length}/{MAX_CARACTERES_MENSAGEM}
                </span>
              </div>
              <textarea
                id={`${id}-mensagem`}
                value={mensagem}
                maxLength={MAX_CARACTERES_MENSAGEM}
                rows={3}
                placeholder={textos.placeholder}
                onChange={(event) => setMensagem(event.target.value)}
                aria-describedby={`${id}-contador`}
                className={`${CAMPO()} mt-1.5 resize-none py-3`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-lightgray px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="flex items-start gap-2 text-xs text-deepgreen/75">
              <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              Só é possível solicitar reunião com quem deu match.
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={onFechar} className={`${BOTAO_SECUNDARIO} flex-1 sm:flex-none`}>
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando || semUnios}
                aria-busy={enviando}
                className={`${BOTAO_PRIMARIO} flex-1 sm:flex-none`}
              >
                {enviando ? "Enviando..." : "Enviar solicitação"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
