import { useCallback, useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useCarregamento } from "../../hooks/useDescoberta";
import { useToast } from "../../hooks/useToast";
import { MOCK_BACKEND } from "../../services/api";
import { obterMeuContato, salvarMeuContato } from "../../services/contatoService";
import type { Contato } from "../../types/contato";
import { formatarTelefone, mascararTelefone, normalizarTelefone, validarEmail } from "../../utils/contato";
import { FOCO_VISIVEL } from "../onboarding/selecao";

type Campo = "whatsapp" | "email" | "telefone";

const CAMPOS: { campo: Campo; rotulo: string; tipo: string; placeholder: string; autoComplete: string }[] = [
  { campo: "whatsapp", rotulo: "WhatsApp", tipo: "tel", placeholder: "(81) 99999-0000", autoComplete: "tel" },
  { campo: "email", rotulo: "E-mail de contato", tipo: "email", placeholder: "voce@exemplo.com", autoComplete: "email" },
  { campo: "telefone", rotulo: "Telefone", tipo: "tel", placeholder: "(81) 3333-0000", autoComplete: "tel" },
];

const ERROS: Record<Campo, string> = {
  whatsapp: "Informe DDD + número (ex.: (81) 99999-0000).",
  email: "Informe um e-mail válido (ex.: voce@exemplo.com).",
  telefone: "Informe DDD + número (ex.: (81) 3333-0000).",
};

function paraFormulario(contato: Contato): Record<Campo, string> {
  return {
    whatsapp: contato.whatsapp ? formatarTelefone(contato.whatsapp) : "",
    email: contato.email ?? "",
    telefone: contato.telefone ? formatarTelefone(contato.telefone) : "",
  };
}

function validar(valores: Record<Campo, string>) {
  const erros: Partial<Record<Campo, string>> = {};
  if (valores.whatsapp.trim() && !normalizarTelefone(valores.whatsapp)) erros.whatsapp = ERROS.whatsapp;
  if (valores.email.trim() && !validarEmail(valores.email)) erros.email = ERROS.email;
  if (valores.telefone.trim() && !normalizarTelefone(valores.telefone)) erros.telefone = ERROS.telefone;
  return erros;
}

function Formulario({ inicial }: { inicial: Contato }) {
  const { user } = useAuth();
  const { mostrar } = useToast();
  const [valores, setValores] = useState(() => paraFormulario(inicial));
  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({});
  const [salvando, setSalvando] = useState(false);

  function alterar(campo: Campo, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: campo === "email" ? valor : mascararTelefone(valor) }));
    if (erros[campo]) setErros((atual) => ({ ...atual, [campo]: undefined }));
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    const novosErros = validar(valores);
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;
    setSalvando(true);
    try {
      const salvo = await salvarMeuContato(user, {
        whatsapp: valores.whatsapp,
        email: valores.email,
        telefone: valores.telefone,
      });
      setValores(paraFormulario(salvo));
      mostrar("Contatos salvos.", "sucesso");
    } catch {
      mostrar("Não foi possível salvar seus contatos. Tente novamente.", "erro");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} noValidate className="mt-5 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CAMPOS.map(({ campo, rotulo, tipo, placeholder, autoComplete }) => {
          const idCampo = `contato-${campo}`;
          const erro = erros[campo];
          return (
            <div key={campo}>
              <label htmlFor={idCampo} className="text-sm font-semibold text-deepgreen">
                {rotulo} <span className="font-normal text-deepgreen/75">(opcional)</span>
              </label>
              <input
                id={idCampo}
                type={tipo}
                inputMode={tipo === "tel" ? "tel" : "email"}
                autoComplete={autoComplete}
                value={valores[campo]}
                placeholder={placeholder}
                onChange={(event) => alterar(campo, event.target.value)}
                aria-invalid={Boolean(erro)}
                aria-describedby={erro ? `${idCampo}-erro` : undefined}
                className={`mt-1.5 min-h-[48px] w-full rounded-2xl border bg-white px-4 text-sm text-deepgreen placeholder:text-deepgreen/50 focus:outline-none focus:ring-2 focus:ring-deepgreen/20 ${
                  erro ? "border-red-600" : "border-lightgray focus:border-deepgreen"
                }`}
              />
              {erro && (
                <p id={`${idCampo}-erro`} className="mt-1 text-xs text-red-700">
                  {erro}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-deepgreen/75">Para remover um canal, apague o campo e salve.</p>
        <button
          type="submit"
          disabled={salvando}
          className={`min-h-[48px] rounded-2xl bg-deepgreen px-6 text-sm font-bold text-white transition hover:bg-sage hover:text-deepgreen disabled:opacity-70 ${FOCO_VISIVEL}`}
        >
          {salvando ? "Salvando..." : "Salvar contatos"}
        </button>
      </div>
    </form>
  );
}

// Modo API: o back só compartilha o e-mail da conta com quem der match (D052).
// Telefone e WhatsApp não existem no back; gravar aqui no navegador enganaria,
// porque o outro lado não veria. Pendência para o squad (ADR-009).
function ContatoDoCadastro() {
  return (
    <section
      aria-labelledby="titulo-contatos"
      className="mt-6 rounded-3xl border border-lightgray bg-white p-5 shadow-soft sm:p-6"
    >
      <h2 id="titulo-contatos" className="text-xl font-bold text-deepgreen">
        Contatos para matches
      </h2>
      <p className="mt-1 flex items-start gap-2 text-sm text-deepgreen/80">
        <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Quem der match com você recebe o e-mail da sua conta, e só depois do match. Telefone e WhatsApp ainda não
        estão disponíveis na plataforma.
      </p>
    </section>
  );
}

// "Contatos para matches": WhatsApp, e-mail e telefone do próprio usuário,
// mostrados só a quem der match com ele (no popup do unio). Só no modo mock.
export default function ContatosForm() {
  return MOCK_BACKEND ? <ContatosLocais /> : <ContatoDoCadastro />;
}

function ContatosLocais() {
  const { user } = useAuth();
  const carregar = useCallback(() => obterMeuContato(user), [user]);
  const { carregando, dados } = useCarregamento(carregar, "Não foi possível carregar seus contatos.");

  return (
    <section
      aria-labelledby="titulo-contatos"
      className="mt-6 rounded-3xl border border-lightgray bg-white p-5 shadow-soft sm:p-6"
    >
      <h2 id="titulo-contatos" className="text-xl font-bold text-deepgreen">
        Contatos para matches
      </h2>
      <p className="mt-1 flex items-start gap-2 text-sm text-deepgreen/80">
        <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        Esses contatos só aparecem para quem deu match com você. Você pode alterar ou remover quando quiser.
      </p>
      {carregando ? (
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-lightgray" aria-hidden="true" />
      ) : (
        <Formulario inicial={dados ?? {}} />
      )}
    </section>
  );
}
