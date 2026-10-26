import { useId } from "react";
import type { TeamMember } from "../../../types/team";
import { parseProfileUrl } from "../../../utils/team";
import { FOCO_VISIVEL } from "../../onboarding/selecao";
import { CHIP } from "../../pitch/styles";
import { GithubIcon, LinkedinIcon } from "./BrandIcons";
import MemberActionsMenu from "./MemberActionsMenu";
import TeamAvatar from "./TeamAvatar";

interface TeamMemberCardProps {
  member: TeamMember;
  onEdit: () => void;
  onRemove: () => void;
}

const ICON_LINK = `inline-flex h-10 w-10 items-center justify-center rounded-full text-deepgreen hover:bg-lightgray ${FOCO_VISIVEL}`;

export default function TeamMemberCard({ member, onEdit, onRemove }: TeamMemberCardProps) {
  const nameId = useId();
  const linkedin = parseProfileUrl(member.linkedinUrl, "linkedin.com");
  const github = parseProfileUrl(member.githubUrl, "github.com");

  return (
    <article
      aria-labelledby={nameId}
      className="flex h-full flex-col rounded-3xl border border-lightgray bg-white p-5 shadow-soft"
    >
      <div className="flex items-start gap-3">
        <TeamAvatar name={member.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 id={nameId} className="break-words text-lg font-bold leading-tight text-deepgreen">
              {member.name}
            </h3>
            {member.founderLabel && <span className={`${CHIP} bg-sage/30 text-deepgreen`}>{member.founderLabel}</span>}
          </div>
          {member.role && <p className="mt-0.5 break-words text-sm text-deepgreen/75">{member.role}</p>}
        </div>
        <div className="-mr-2 -mt-2 flex shrink-0 items-center">
          {linkedin && (
            <a
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`LinkedIn de ${member.name} (abre em nova aba)`}
              className={ICON_LINK}
            >
              <LinkedinIcon />
            </a>
          )}
          {github && (
            <a
              href={github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`GitHub de ${member.name} (abre em nova aba)`}
              className={ICON_LINK}
            >
              <GithubIcon />
            </a>
          )}
          <MemberActionsMenu memberName={member.name} onEdit={onEdit} onRemove={onRemove} />
        </div>
      </div>

      {member.bio && (
        <p className="mt-4 line-clamp-2 break-words text-sm leading-relaxed text-deepgreen/90">{member.bio}</p>
      )}

      {member.skills.length > 0 && (
        <ul aria-label="Competências" className="mt-4 flex flex-wrap gap-1.5 border-t border-lightgray pt-4">
          {member.skills.map((skill) => (
            <li key={skill} className="rounded-md bg-lightgray/70 px-2 py-0.5 text-xs font-medium text-deepgreen">
              {skill}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
