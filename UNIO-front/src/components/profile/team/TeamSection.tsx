import { useRef, useState } from "react";
import { CircleAlert, UserPlus, Users } from "lucide-react";
import type { StartupTeam } from "../../../hooks/useStartupTeam";
import type { TeamMember } from "../../../types/team";
import { TEAM_MAX_MEMBERS } from "../../../utils/team";
import AvisoEstado from "../../discovery/AvisoEstado";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "../../pitch/styles";
import InviteBanner from "./InviteBanner";
import MemberFormDialog from "./MemberFormDialog";
import RemoveMemberDialog from "./RemoveMemberDialog";
import TeamMemberCard from "./TeamMemberCard";
import TeamSkeleton from "./TeamSkeleton";

interface TeamSectionProps {
  team: StartupTeam;
  startupName: string;
}

type DialogState = { kind: "form"; member: TeamMember | null } | { kind: "remove"; member: TeamMember } | null;

const HEADING_ID = "team-heading";
const LIMIT_ID = "team-limit";

export default function TeamSection({ team, startupName }: TeamSectionProps) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { members, count } = team;

  const addButton = (
    <button
      type="button"
      onClick={() => setDialog({ kind: "form", member: null })}
      disabled={!team.canAdd}
      aria-describedby={team.canAdd ? undefined : LIMIT_ID}
      className={PRIMARY_BUTTON}
    >
      <UserPlus size={18} aria-hidden="true" />
      Adicionar membro
    </button>
  );

  let content;
  if (team.loading) {
    content = <TeamSkeleton />;
  } else if (team.loadError) {
    content = (
      <div className="mt-5">
        <AvisoEstado
          erro
          icone={CircleAlert}
          titulo="Não foi possível carregar a equipe"
          texto={team.loadError}
          acao={
            <button type="button" onClick={team.reload} className={OUTLINE_BUTTON}>
              Tentar novamente
            </button>
          }
        />
      </div>
    );
  } else if (members.length === 0) {
    content = (
      <div className="mt-5">
        <AvisoEstado
          icone={Users}
          titulo="Nenhum membro cadastrado ainda"
          texto="Apresente quem está por trás da startup: fundadores, lideranças técnicas e comerciais."
          acao={addButton}
        />
      </div>
    );
  } else {
    content = (
      <ul className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {members.map((member) => (
          <li key={member.id} className="min-w-0">
            <TeamMemberCard
              member={member}
              onEdit={() => setDialog({ kind: "form", member })}
              onRemove={() => setDialog({ kind: "remove", member })}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section aria-labelledby={HEADING_ID}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lightgray text-deepgreen"
            aria-hidden="true"
          >
            <Users size={20} />
          </span>
          <div className="min-w-0">
            <h2
              id={HEADING_ID}
              ref={headingRef}
              tabIndex={-1}
              className="text-xl font-bold text-deepgreen focus:outline-none"
            >
              Membros cadastrados
              {count !== null && count > 0 && <span className="font-normal text-deepgreen/75"> ({count})</span>}
            </h2>
            <p className="mt-1 text-sm text-deepgreen/80">
              Apresente os fundadores e lideranças técnicas para investidores e mentores.
            </p>
          </div>
        </div>
        {members.length > 0 && (
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            {addButton}
            {!team.canAdd && (
              <p id={LIMIT_ID} className="text-xs text-deepgreen/75">
                Limite de {TEAM_MAX_MEMBERS} membros atingido.
              </p>
            )}
          </div>
        )}
      </div>

      {content}

      <InviteBanner startupName={startupName} />

      {dialog?.kind === "form" && (
        <MemberFormDialog
          member={dialog.member}
          fallbackFocusRef={headingRef}
          onSubmit={(values) => team.saveMember(values, dialog.member?.id ?? null)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "remove" && (
        <RemoveMemberDialog
          memberName={dialog.member.name}
          fallbackFocusRef={headingRef}
          onConfirm={() => team.removeMember(dialog.member.id)}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}
