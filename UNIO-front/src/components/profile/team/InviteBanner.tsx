import { Mail, Users } from "lucide-react";
import { OUTLINE_BUTTON } from "../../pitch/styles";

export default function InviteBanner({ startupName }: { startupName: string }) {
  const startup = startupName ? `da ${startupName}` : "da nossa startup";
  const subject = `Convite para a equipe ${startup} na UNIO`;
  const body = [
    "Olá!",
    "",
    `Estou cadastrando a equipe ${startup} na UNIO, a plataforma do Porto Digital que conecta startups a investidores-anjo e mentores.`,
    "",
    `Quero apresentar você como parte do nosso time. Conheça a plataforma e crie sua conta: ${window.location.origin}`,
    "",
    "Até breve!",
  ].join("\n");
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-3xl bg-lightgray/60 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage/40 text-deepgreen"
          aria-hidden="true"
        >
          <Users size={20} />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-deepgreen">Startups com equipe completa recebem mais contatos de investidores.</p>
          <p className="mt-1 text-sm text-deepgreen/80">
            Investidores valorizam times multidisciplinares com equilíbrio técnico, comercial e agronômico para validar a
            execução da tese.
          </p>
        </div>
      </div>
      <a href={href} className={`${OUTLINE_BUTTON} shrink-0 self-start sm:self-auto`}>
        <Mail size={16} aria-hidden="true" />
        Convidar via e-mail
      </a>
    </div>
  );
}
