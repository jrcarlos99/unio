import { useLocation, useNavigate } from "react-router-dom";
import SuccessMessage from "../../../components/ui/SuccessMessage";
import AdminPageHeader from "../../admin/components/AdminPageHeader";
import AttentionPointCard from "../components/AttentionPointCard";
import CompatibleInvestorsCard from "../components/CompatibleInvestorsCard";
import HomeSkeleton from "../components/HomeSkeleton";
import NextMeetingCard from "../components/NextMeetingCard";
import ProfileCompletionCard from "../components/ProfileCompletionCard";
import { useStartupHome } from "../hooks/useStartupHome";

function hasSignupSuccess(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    "cadastroSucesso" in state &&
    state.cadastroSucesso === true
  );
}

export default function StartupOverview() {
  const { state, reload } = useStartupHome();
  const navigate = useNavigate();
  const location = useLocation();
  const signupSuccess = hasSignupSuccess(location.state);

  if (state.status === "loading") return <HomeSkeleton />;

  if (state.status === "error") {
    return (
      <div role="alert" className="rounded-2xl border border-deepgreen/10 bg-lightgray p-6 text-deepgreen">
        <p className="font-semibold">{state.message}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-4 rounded-full bg-deepgreen px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sage hover:text-deepgreen"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const { startup, profileCompletion, pendingProfileSections, topInvestors, nextMeeting, attentionPoint } =
    state.data;
  const profileComplete = profileCompletion >= 100;

  return (
    <div>
      {signupSuccess && (
        <SuccessMessage message="Cadastro realizado com sucesso! Bem-vindo(a) à UNIO." />
      )}

      <AdminPageHeader
        title={`Olá, ${startup.name}`}
        subtitle={`${startup.segment} · Estágio ${startup.stage}`}
        actionLabel="Ver investidores compatíveis"
        onAction={() => navigate("/home-startup/investidores")}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {!profileComplete && (
          <ProfileCompletionCard
            completion={profileCompletion}
            pendingSections={pendingProfileSections}
          />
        )}
        <CompatibleInvestorsCard
          investors={topInvestors}
          className={profileComplete ? "lg:col-span-3" : "lg:col-span-2"}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NextMeetingCard
          meeting={nextMeeting}
          className={attentionPoint === null ? "lg:col-span-2" : ""}
        />
        {attentionPoint !== null && <AttentionPointCard criterion={attentionPoint} />}
      </div>
    </div>
  );
}
