import { useId, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ShieldCheck, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import { getApiErrorMessage } from "../../services/api";
import { PRIVACIDADE_DISPONIVEL, excluirMinhaConta, exportarMeusDados } from "../../services/privacidadeService";
import { FOCO_VISIVEL } from "../onboarding/selecao";

const BOTAO = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition ${FOCO_VISIVEL}`;

type Etapa = "fechado" | "aviso" | "senha";

// "Privacidade e dados" do Meu perfil (LGPD, ADR-010): exportar os dados em
// JSON e excluir a conta com confirmação em duas etapas (aviso de que é
// irreversível e depois a senha). Depois de excluir, sai da conta.
export default function PrivacidadeDados() {
  if (!PRIVACIDADE_DISPONIVEL) return null;
  return <SecaoPrivacidade />;
}

function SecaoPrivacidade() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const id = useId();
  const [exportando, setExportando] = useState(false);
  const [etapa, setEtapa] = useState<Etapa>("fechado");
  const [senha, setSenha] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  async function exportar() {
    setExportando(true);
    try {
      await exportarMeusDados();
      mostrar("Arquivo com seus dados baixado.", "sucesso");
    } catch (falha) {
      mostrar(getApiErrorMessage(falha, "Não foi possível exportar seus dados."), "erro");
    } finally {
      setExportando(false);
    }
  }

  function cancelar() {
    setEtapa("fechado");
    setSenha("");
    setErro("");
  }

  async function excluir(event: FormEvent) {
    event.preventDefault();
    if (!senha.trim()) {
      setErro("Informe sua senha para confirmar.");
      return;
    }
    setExcluindo(true);
    setErro("");
    try {
      await excluirMinhaConta(senha);
      logout();
      navigate("/", { replace: true });
    } catch (falha) {
      setErro(getApiErrorMessage(falha, "Não foi possível excluir a conta."));
      setExcluindo(false);
    }
  }

  return (
    <section
      aria-labelledby={`${id}-titulo`}
      className="mt-6 rounded-3xl border border-lightgray bg-white p-5 shadow-soft sm:p-6"
    >
      <h2 id={`${id}-titulo`} className="flex items-center gap-2 text-xl font-bold text-deepgreen">
        <ShieldCheck size={20} aria-hidden="true" />
        Privacidade e dados
      </h2>
      <p className="mt-1 text-sm text-deepgreen/80">
        Você pode baixar uma cópia dos seus dados ou excluir sua conta a qualquer momento (LGPD).
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={exportar}
          disabled={exportando}
          className={`${BOTAO} border border-lightgray bg-white text-deepgreen hover:border-sage disabled:opacity-60`}
        >
          <Download size={16} aria-hidden="true" />
          {exportando ? "Preparando arquivo..." : "Exportar meus dados"}
        </button>
        {etapa === "fechado" && (
          <button
            type="button"
            onClick={() => setEtapa("aviso")}
            className={`${BOTAO} border border-red-200 bg-white text-red-700 hover:bg-red-50`}
          >
            <Trash2 size={16} aria-hidden="true" />
            Excluir minha conta
          </button>
        )}
      </div>

      {etapa === "aviso" && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-deepgreen" role="alert">
          <p className="font-semibold text-red-700">Esta ação não pode ser desfeita.</p>
          <p className="mt-1">
            Seu perfil, respostas do onboarding, interesses, salvos e matches são apagados. Reuniões ativas são
            canceladas e suas mensagens e comentários perdem o conteúdo. Seu e-mail deixa de existir na plataforma.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setEtapa("senha")} className={`${BOTAO} bg-red-700 text-white hover:bg-red-800`}>
              Entendi, quero continuar
            </button>
            <button type="button" onClick={cancelar} className={`${BOTAO} border border-lightgray bg-white text-deepgreen`}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {etapa === "senha" && (
        <form onSubmit={excluir} className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm" noValidate>
          <label htmlFor={`${id}-senha`} className="font-semibold text-deepgreen">
            Para confirmar, digite sua senha
          </label>
          <input
            id={`${id}-senha`}
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            aria-invalid={Boolean(erro)}
            aria-describedby={erro ? `${id}-erro` : undefined}
            className={`mt-2 block w-full max-w-sm rounded-xl border border-lightgray bg-white px-3 py-2 text-deepgreen ${FOCO_VISIVEL}`}
          />
          {erro && (
            <p id={`${id}-erro`} className="mt-2 text-red-700" role="alert">
              {erro}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={excluindo}
              className={`${BOTAO} bg-red-700 text-white hover:bg-red-800 disabled:opacity-60`}
            >
              {excluindo ? "Excluindo..." : "Excluir definitivamente"}
            </button>
            <button type="button" onClick={cancelar} className={`${BOTAO} border border-lightgray bg-white text-deepgreen`}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
