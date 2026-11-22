import { Lock } from "lucide-react";

// "Contatos para matches" do Meu perfil. O back só compartilha o e-mail da
// conta com quem der match (D052). Telefone e WhatsApp não existem no back;
// gravar no navegador enganaria, porque o outro lado não veria (ADR-009 e
// ADR-011). Pendência para o squad: campos de contato no perfil.
export default function ContatosForm() {
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
