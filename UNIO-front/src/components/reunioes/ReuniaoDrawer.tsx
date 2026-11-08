import { useCallback, useId, useState, type FormEvent, type ReactNode } from "react";
import { CalendarPlus, Clock, Copy, ExternalLink, MapPin, Pencil, Video } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import {
  cancelarReuniao,
  definirLinkOuLocal,
  detectarConflito,
  gerarIcs,
  remarcarReuniao,
  type SessaoReunioes,
} from "../../services/reunioesService";
import type { Reuniao } from "../../types/reunioes";
import {
  FUSO_ROTULO,
  formatarDataCurta,
  formatarDataLonga,
  formatarDiaSemanaLongo,
  formatarFaixaHorario,
} from "../../utils/datas";
import { baixarIcs } from "../../utils/ics";
import { ROTULO_STATUS, dominioDoLink, linkGoogleMaps, validarLinkHttps } from "../../utils/reunioes";
import { FOCO_VISIVEL } from "../onboarding/selecao";
import CartaoContraparte from "./CartaoContraparte";
import { ConfirmacaoInline } from "./Comuns";
import { BOTAO_PERIGO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, ERRO, ROTULO } from "./estilos";
import { criarLinha, isoDaLinha, validarLinhas, type LinhaHorario } from "./horarios";
import PainelLateral from "./PainelLateral";
import SeletorHorarios from "./SeletorHorarios";

interface ReuniaoDrawerProps {
  sessao: SessaoReunioes;
  reuniao: Reuniao;
  onFechar: () => void;
}

type Modo = "ver" | "remarcar" | "cancelar";

const LINK_SECUNDARIO = `inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-deepgreen hover:bg-lightgray/60 ${FOCO_VISIVEL}`;

function SeloStatus({ reuniao }: { reuniao: Reuniao }) {
  const classes: Record<Reuniao["status"], string> = {
    confirmada: "bg-deepgreen text-white",
    pendente: "border border-dashed border-sage bg-sage/20 text-deepgreen",
    recusada: "bg-red-50 text-red-800",
    cancelada: "bg-red-50 text-red-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes[reuniao.status]}`}>
      {ROTULO_STATUS[reuniao.status]}
    </span>
  );
}

function Secao({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{titulo}</h3>
        {acao}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

// Link da reunião (online): domínio, Copiar e Entrar. Quem organiza informa
// ou edita. O href só é montado com a URL validada (https).
function SecaoLink({ sessao, reuniao }: { sessao: SessaoReunioes; reuniao: Reuniao }) {
  const { mostrar } = useToast();
  const id = useId();
  const link = validarLinkHttps(reuniao.link);
  const organizo = reuniao.organizador === "eu";
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(reuniao.link ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      mostrar("Link copiado", "sucesso");
    } catch {
      mostrar("Não foi possível copiar. Selecione o link e copie manualmente.", "erro");
    }
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (valor.trim() && !validarLinkHttps(valor)) {
      setErro("Informe um link que comece com https://");
      return;
    }
    setSalvando(true);
    try {
      await definirLinkOuLocal(sessao, reuniao.id, { link: valor });
      mostrar(valor.trim() ? "Link da reunião salvo." : "Link removido.", "sucesso");
      setEditando(false);
    } catch (falha) {
      mostrar(falha instanceof Error ? falha.message : "Não foi possível salvar o link.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  const botaoEditar = organizo && !editando && (
    <button type="button" onClick={() => setEditando(true)} className={LINK_SECUNDARIO}>
      <Pencil size={14} aria-hidden="true" />
      {link ? "Editar" : "Informar link"}
    </button>
  );

  return (
    <Secao titulo="Link da reunião" acao={botaoEditar}>
      {editando ? (
        <form onSubmit={salvar} noValidate>
          <label htmlFor={`${id}-link`} className={ROTULO}>
            Link (https)
          </label>
          <input
            id={`${id}-link`}
            type="url"
            inputMode="url"
            value={valor}
            placeholder="https://meet.google.com/..."
            onChange={(event) => {
              setValor(event.target.value);
              setErro("");
            }}
            aria-invalid={Boolean(erro)}
            aria-describedby={erro ? `${id}-erro` : undefined}
            className={`${CAMPO(Boolean(erro))} mt-1.5`}
          />
          {erro && (
            <p id={`${id}-erro`} className={ERRO}>
              {erro}
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setEditando(false)} className={BOTAO_SECUNDARIO}>
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className={BOTAO_PRIMARIO}>
              {salvando ? "Salvando..." : "Salvar link"}
            </button>
          </div>
        </form>
      ) : link ? (
        <div className="rounded-2xl border border-lightgray p-3">
          <p className="flex items-center gap-2 text-sm">
            <Video size={16} aria-hidden="true" />
            <span className="truncate font-semibold">{dominioDoLink(link)}</span>
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            <button type="button" onClick={copiar} className={BOTAO_SECUNDARIO}>
              <Copy size={16} aria-hidden="true" />
              Copiar
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer" className={BOTAO_PRIMARIO}>
              <ExternalLink size={16} aria-hidden="true" />
              Entrar na reunião
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
          </div>
        </div>
      ) : (
        <p className="rounded-2xl bg-lightgray/50 p-3 text-sm">
          {organizo
            ? "Informe o link da sala (Google Meet, Zoom, Teams...) para a outra parte entrar."
            : `${reuniao.contraparte.nome} ainda não informou o link da reunião.`}
        </p>
      )}
    </Secao>
  );
}

// Local do encontro (presencial). Quem organiza informa ou edita.
function SecaoLocal({ sessao, reuniao }: { sessao: SessaoReunioes; reuniao: Reuniao }) {
  const { mostrar } = useToast();
  const id = useId();
  const organizo = reuniao.organizador === "eu";
  const local = reuniao.local;
  const [editando, setEditando] = useState(false);
  const [valores, setValores] = useState({
    nome: local?.nome ?? "",
    endereco: local && local.endereco !== local.nome ? local.endereco : "",
    referencia: local?.referencia ?? "",
  });
  const [erros, setErros] = useState<{ nome?: string; endereco?: string }>({});
  const [salvando, setSalvando] = useState(false);

  async function salvar(event: FormEvent) {
    event.preventDefault();
    const novos = {
      ...(valores.nome.trim() ? {} : { nome: "Informe o nome do local." }),
      ...(valores.endereco.trim() ? {} : { endereco: "Informe o endereço." }),
    };
    setErros(novos);
    if (Object.keys(novos).length > 0) return;
    setSalvando(true);
    try {
      await definirLinkOuLocal(sessao, reuniao.id, { local: valores });
      mostrar("Local do encontro salvo.", "sucesso");
      setEditando(false);
    } catch (falha) {
      mostrar(falha instanceof Error ? falha.message : "Não foi possível salvar o local.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  const botaoEditar = organizo && !editando && (
    <button type="button" onClick={() => setEditando(true)} className={LINK_SECUNDARIO}>
      <Pencil size={14} aria-hidden="true" />
      {local ? "Editar" : "Informar local"}
    </button>
  );

  const campos = [
    { campo: "nome", rotulo: "Nome do local", placeholder: "Ex.: Porto Digital, Armazém 14" },
    { campo: "endereco", rotulo: "Endereço", placeholder: "Rua, número, bairro, Recife - PE" },
    { campo: "referencia", rotulo: "Ponto de referência (opcional)", placeholder: "Ex.: recepção no térreo" },
  ] as const;

  return (
    <Secao titulo="Local do encontro" acao={botaoEditar}>
      {editando ? (
        <form onSubmit={salvar} noValidate className="space-y-3">
          {campos.map(({ campo, rotulo, placeholder }) => {
            const erro = campo === "referencia" ? undefined : erros[campo];
            return (
              <div key={campo}>
                <label htmlFor={`${id}-${campo}`} className={ROTULO}>
                  {rotulo}
                </label>
                <input
                  id={`${id}-${campo}`}
                  type="text"
                  maxLength={160}
                  value={valores[campo]}
                  placeholder={placeholder}
                  onChange={(event) => setValores((atual) => ({ ...atual, [campo]: event.target.value }))}
                  aria-invalid={Boolean(erro)}
                  aria-describedby={erro ? `${id}-${campo}-erro` : undefined}
                  className={`${CAMPO(Boolean(erro))} mt-1.5`}
                />
                {erro && (
                  <p id={`${id}-${campo}-erro`} className={ERRO}>
                    {erro}
                  </p>
                )}
              </div>
            );
          })}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditando(false)} className={BOTAO_SECUNDARIO}>
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className={BOTAO_PRIMARIO}>
              {salvando ? "Salvando..." : "Salvar local"}
            </button>
          </div>
        </form>
      ) : local ? (
        <div className="rounded-2xl border border-lightgray p-3 text-sm">
          <p className="flex items-start gap-2 font-semibold">
            <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            {local.nome}
          </p>
          {local.endereco !== local.nome && <p className="ml-6 mt-0.5 text-deepgreen/80">{local.endereco}</p>}
          {local.referencia && <p className="ml-6 mt-0.5 text-xs text-deepgreen/75">Referência: {local.referencia}</p>}
          <a
            href={linkGoogleMaps(local.endereco)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${BOTAO_SECUNDARIO} mt-3 w-full`}
          >
            <ExternalLink size={16} aria-hidden="true" />
            Abrir rota no Google Maps
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </div>
      ) : (
        <p className="rounded-2xl bg-lightgray/50 p-3 text-sm">
          {organizo
            ? "Informe onde vai ser o encontro."
            : `${reuniao.contraparte.nome} ainda não informou o local do encontro.`}
        </p>
      )}
    </Secao>
  );
}

// Detalhe de uma reunião confirmada (ou pendente enviada por você): data,
// contraparte, pauta, link ou local e as ações (.ics, remarcar, cancelar)
export default function ReuniaoDrawer({ sessao, reuniao, onFechar }: ReuniaoDrawerProps) {
  const { mostrar } = useToast();
  const id = useId();
  const nome = reuniao.contraparte.nome;
  const [modo, setModo] = useState<Modo>("ver");
  const [linhas, setLinhas] = useState<LinhaHorario[]>(() => [criarLinha()]);
  const [errosHorarios, setErrosHorarios] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);

  const confirmada = reuniao.status === "confirmada" && reuniao.horarioConfirmado;
  const pendenteEnviada = reuniao.status === "pendente" && reuniao.solicitante === "eu";
  const ativa = reuniao.status === "confirmada" || reuniao.status === "pendente";

  const conflitoDe = useCallback(
    (iso: string) => detectarConflito(sessao, iso, reuniao.duracaoMin, reuniao.id),
    [sessao, reuniao],
  );

  async function executar(acao: () => Promise<unknown>, sucesso: string, fechar = true) {
    setOcupado(true);
    try {
      await acao();
      mostrar(sucesso, "sucesso");
      if (fechar) onFechar();
    } catch (falha) {
      mostrar(falha instanceof Error ? falha.message : "Não foi possível concluir. Tente novamente.", "erro");
    } finally {
      setOcupado(false);
    }
  }

  async function baixar() {
    try {
      const arquivo = await gerarIcs(sessao, reuniao.id);
      baixarIcs(arquivo.nomeArquivo, arquivo.conteudo);
      mostrar("Arquivo .ics baixado. Abra para adicionar ao seu calendário.", "sucesso");
    } catch (falha) {
      mostrar(falha instanceof Error ? falha.message : "Não foi possível gerar o arquivo.", "erro");
    }
  }

  function enviarRemarcacao() {
    const erros = validarLinhas(linhas);
    setErrosHorarios(erros);
    if (Object.keys(erros).length > 0) return;
    const novos = linhas.map(isoDaLinha).filter((iso): iso is string => iso !== null);
    void executar(() => remarcarReuniao(sessao, reuniao.id, novos), `Novos horários enviados para ${nome}.`);
  }

  const rodape = !ativa ? null : modo === "remarcar" ? (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button type="button" onClick={() => setModo("ver")} disabled={ocupado} className={BOTAO_SECUNDARIO}>
        Voltar
      </button>
      <button type="button" onClick={enviarRemarcacao} disabled={ocupado} aria-busy={ocupado} className={BOTAO_PRIMARIO}>
        {ocupado ? "Enviando..." : "Enviar novos horários"}
      </button>
    </div>
  ) : modo === "cancelar" ? (
    <ConfirmacaoInline
      titulo={pendenteEnviada ? `Cancelar a solicitação para ${nome}?` : `Cancelar a reunião com ${nome}?`}
      texto={`${nome} será avisado. Vocês continuam sendo unios.`}
      rotuloConfirmar={pendenteEnviada ? "Cancelar solicitação" : "Cancelar reunião"}
      rotuloOcupado="Cancelando..."
      ocupado={ocupado}
      onCancelar={() => setModo("ver")}
      onConfirmar={() =>
        executar(
          () => cancelarReuniao(sessao, reuniao.id),
          pendenteEnviada ? `Solicitação para ${nome} cancelada.` : `Reunião com ${nome} cancelada.`,
        )
      }
    />
  ) : pendenteEnviada ? (
    <button type="button" onClick={() => setModo("cancelar")} className={`${BOTAO_PERIGO} w-full`}>
      Cancelar solicitação
    </button>
  ) : (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={baixar} className={`${BOTAO_PRIMARIO} w-full`}>
        <CalendarPlus size={16} aria-hidden="true" />
        Adicionar ao Google Agenda (.ics)
      </button>
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        <button type="button" onClick={() => setModo("remarcar")} className={BOTAO_SECUNDARIO}>
          Remarcar
        </button>
        <button type="button" onClick={() => setModo("cancelar")} className={BOTAO_PERIGO}>
          Cancelar reunião
        </button>
      </div>
    </div>
  );

  const descricao = reuniao.pauta || reuniao.mensagem;
  const IconeFormato = reuniao.formato === "presencial" ? MapPin : Video;

  return (
    <PainelLateral
      titulo="Detalhes da reunião"
      selo={<SeloStatus reuniao={reuniao} />}
      onFechar={onFechar}
      rodape={
        <>
          {rodape}
          <p className={`text-center text-xs text-deepgreen/60 ${rodape ? "mt-3" : ""}`}>ID #{reuniao.codigo}</p>
        </>
      }
    >
      {confirmada && reuniao.horarioConfirmado ? (
        <div className="rounded-2xl bg-deepgreen p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/75">
            {formatarDiaSemanaLongo(reuniao.horarioConfirmado)}
          </p>
          <p className="mt-0.5 text-lg font-bold">{formatarDataLonga(reuniao.horarioConfirmado)}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} aria-hidden="true" />
              {formatarFaixaHorario(reuniao.horarioConfirmado, reuniao.duracaoMin)}
            </span>
            <span>{reuniao.duracaoMin} min</span>
            <span className="inline-flex items-center gap-1.5">
              <IconeFormato size={14} aria-hidden="true" />
              {reuniao.formato === "presencial" ? "Presencial" : "Online"}
            </span>
          </p>
          <p className="mt-1 text-xs text-white/75">{FUSO_ROTULO}</p>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-sage bg-sage/10 p-4">
          <p className="text-sm font-bold">
            {pendenteEnviada ? `Aguardando ${nome}` : ROTULO_STATUS[reuniao.status]}
          </p>
          <p className="mt-0.5 text-xs text-deepgreen/75">
            {pendenteEnviada ? "Horários sugeridos" : "Horários que estavam em discussão"} ({FUSO_ROTULO})
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {(reuniao.horarioConfirmado ? [reuniao.horarioConfirmado] : reuniao.horariosSugeridos).map((iso) => (
              <li key={iso} className="flex items-center gap-2">
                <Clock size={14} aria-hidden="true" />
                <span className="capitalize">{formatarDataCurta(iso)}</span>, {formatarFaixaHorario(iso, reuniao.duracaoMin)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {modo === "remarcar" && (
        <section aria-labelledby={`${id}-remarcar`} className="mt-6">
          <h3 id={`${id}-remarcar`} className="font-bold">
            Remarcar
          </h3>
          <p className="mb-3 mt-1 text-xs text-deepgreen/75">
            Sugira até 3 novos horários. A reunião volta a ficar pendente até {nome} aceitar.
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
      )}

      <div className="mt-5">
        <CartaoContraparte contraparte={reuniao.contraparte} rotuloPerfil="Ver perfil" onNavegar={onFechar}>
          {reuniao.participante && (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-lightgray pt-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{reuniao.participante.nome}</span>
                <span className="block truncate text-xs text-deepgreen/75">{reuniao.participante.cargo}</span>
              </span>
              <span className="shrink-0 rounded-full bg-lightgray px-2 py-0.5 text-xs font-semibold">
                {reuniao.participante.papel}
              </span>
            </div>
          )}
        </CartaoContraparte>
      </div>

      <Secao titulo="Pauta">
        <p className="text-sm font-semibold">{reuniao.assunto}</p>
        {descricao && <p className="mt-1 text-sm text-deepgreen/80">{descricao}</p>}
      </Secao>

      {ativa &&
        (reuniao.formato === "online" ? (
          <SecaoLink key={reuniao.link ?? ""} sessao={sessao} reuniao={reuniao} />
        ) : (
          <SecaoLocal key={JSON.stringify(reuniao.local ?? null)} sessao={sessao} reuniao={reuniao} />
        ))}
    </PainelLateral>
  );
}
