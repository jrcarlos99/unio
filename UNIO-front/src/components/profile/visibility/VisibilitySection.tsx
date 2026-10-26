import { useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import type { ProfileVisibility } from "../../../hooks/useProfileVisibility";
import type { StartupProfileFormValues } from "../../../types/startupProfile";
import AvisoEstado from "../../discovery/AvisoEstado";
import { OUTLINE_BUTTON } from "../../pitch/styles";
import ProfileCardPreview from "../ProfileCardPreview";
import PauseProfileDialog from "./PauseProfileDialog";
import ProfileStatusCard from "./ProfileStatusCard";
import VisibilityRulesCard from "./VisibilityRulesCard";
import VisibilitySkeleton from "./VisibilitySkeleton";

interface VisibilitySectionProps {
  visibility: ProfileVisibility;
  profile: StartupProfileFormValues | null;
  profileLoading: boolean;
  teamCount: number | null;
  documentCount: number | null;
}

const HEADING_ID = "visibility-heading";

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export default function VisibilitySection({
  visibility,
  profile,
  profileLoading,
  teamCount,
  documentCount,
}: VisibilitySectionProps) {
  const [confirmingPause, setConfirmingPause] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { values } = visibility;

  let content;
  if (visibility.loading || profileLoading) {
    content = <VisibilitySkeleton />;
  } else if (visibility.loadError || !values) {
    content = (
      <div className="mt-5">
        <AvisoEstado
          erro
          icone={CircleAlert}
          titulo="Não foi possível carregar as preferências de visibilidade"
          texto={visibility.loadError ?? undefined}
          acao={
            <button type="button" onClick={visibility.reload} className={OUTLINE_BUTTON}>
              Tentar novamente
            </button>
          }
        />
      </div>
    );
  } else {
    const details: { label: string; value: string }[] = [];
    if (values.showTeam && teamCount) {
      details.push({ label: "Equipe", value: plural(teamCount, "membro", "membros") });
    }
    if (documentCount) {
      details.push({
        label: "Documentos",
        value:
          values.documents === "everyone"
            ? plural(documentCount, "documento", "documentos")
            : "Somente após o match",
      });
    }

    content = (
      <div className="mt-5 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-6 lg:col-span-3">
          <ProfileStatusCard
            status={values.status}
            onSelectActive={() => visibility.setSetting("status", "active")}
            onRequestPause={() => setConfirmingPause(true)}
          />
          <VisibilityRulesCard values={values} onChange={visibility.setSetting} />
        </div>
        <div className="min-w-0 lg:col-span-2">
          {profile ? (
            <ProfileCardPreview
              values={profile}
              title="Como investidores veem sua startup"
              subtitle="Prévia com as escolhas desta aba, incluindo as que ainda não foram salvas."
              hidePitch={!values.showPitch}
              hideCapital={!values.showCapital}
              paused={values.status === "paused"}
              details={details}
            />
          ) : (
            <AvisoEstado
              icone={CircleAlert}
              titulo="Prévia indisponível"
              texto="Não foi possível carregar os dados gerais do perfil para montar a prévia."
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} ref={headingRef} tabIndex={-1} className="sr-only">
        Visibilidade
      </h2>
      <p className="text-sm text-deepgreen/80">Controle como sua startup aparece para os investidores da rede.</p>

      {content}

      {confirmingPause && (
        <PauseProfileDialog
          fallbackFocusRef={headingRef}
          onConfirm={() => visibility.setSetting("status", "paused")}
          onClose={() => setConfirmingPause(false)}
        />
      )}
    </section>
  );
}
