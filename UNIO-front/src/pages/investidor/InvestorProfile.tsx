import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, ShieldCheck, Target } from "lucide-react";
import AvisoEstado from "../../components/discovery/AvisoEstado";
import { FOCO_VISIVEL } from "../../components/onboarding/selecao";
import { OUTLINE_BUTTON } from "../../components/pitch/styles";
import AboutCard from "../../components/profile/investor/AboutCard";
import InvestorCardPreview from "../../components/profile/investor/InvestorCardPreview";
import MentoringCard from "../../components/profile/investor/MentoringCard";
import ThesisSummary from "../../components/profile/investor/ThesisSummary";
import PendingChangesBar from "../../components/profile/PendingChangesBar";
import ProfilePageSkeleton from "../../components/profile/ProfilePageSkeleton";
import Tabs, { TabPanel, type TabItem } from "../../components/ui/Tabs";
import ContatosForm from "../../components/unios/ContatosForm";
import { useAuth } from "../../contexts/AuthContext";
import { DISPONIBILIDADES_DETALHADAS } from "../../data/options";
import { useCarregamento, useUserKey } from "../../hooks/useDescoberta";
import { useInvestorProfileEditor } from "../../hooks/useInvestorProfileEditor";
import { loadAnswers } from "../../services/onboardingService";
import type { RespostasInvestidor } from "../../types/onboarding";
import { nomeUsuario } from "../../utils/nomeUsuario";

type ProfileTab = "tese" | "mentoria";

const TABS_ID = "perfil-investidor-tabs";

function profileTabs(unsaved: boolean): TabItem<ProfileTab>[] {
  return [
    { id: "tese", label: "Tese de investimento", icon: Target },
    { id: "mentoria", label: "Mentoria e perfil", icon: ShieldCheck, alert: unsaved ? "alterações não salvas" : undefined },
  ];
}

function onboardingAvailabilityText(value: RespostasInvestidor["disponibilidade"] | undefined) {
  const option = DISPONIBILIDADES_DETALHADAS.find((item) => item.valor === value);
  return option ? `${option.valor} (${option.descricao})` : undefined;
}

export default function InvestorProfile() {
  const { user } = useAuth();
  const userKey = useUserKey();
  const editor = useInvestorProfileEditor();
  const { saved, values, errors } = editor;
  const [activeTab, setActiveTab] = useState<ProfileTab>("mentoria");
  const loadThesis = useCallback(() => loadAnswers<RespostasInvestidor>(userKey, "investidor"), [userKey]);
  const thesis = useCarregamento(loadThesis, "Não foi possível carregar sua tese.");

  const name = nomeUsuario(user);

  let content;
  if (editor.loading) {
    content = <ProfilePageSkeleton label="Carregando seu perfil" />;
  } else if (editor.loadError || !saved || !values) {
    content = (
      <AvisoEstado
        erro
        icone={CircleAlert}
        titulo="Não foi possível carregar o perfil"
        texto={editor.loadError ?? undefined}
        acao={
          <button type="button" onClick={editor.reload} className={OUTLINE_BUTTON}>
            Tentar novamente
          </button>
        }
      />
    );
  } else {
    content = (
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-6 lg:col-span-3">
          <MentoringCard
            values={values}
            errors={errors}
            onboardingAvailability={
              saved.disponibilidade ? undefined : onboardingAvailabilityText(thesis.dados?.disponibilidade)
            }
            onChange={editor.setField}
            onBlur={editor.touchField}
          />
          <AboutCard values={values} errors={errors} onChange={editor.setField} onBlur={editor.touchField} />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <InvestorCardPreview name={name} values={values} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 border-b border-lightgray pb-5">
        <nav aria-label="Trilha de navegação">
          <ol className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-deepgreen/75">
            <li>
              <Link to="/home-investidor" className={`rounded hover:text-deepgreen hover:underline ${FOCO_VISIVEL}`}>
                Início
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>Área do Investidor</li>
          </ol>
        </nav>
        <h1 className="mt-2 text-3xl font-bold text-deepgreen sm:text-4xl">Meu Perfil</h1>
        <p className="mt-2 max-w-2xl text-deepgreen/80">
          Gerencie as informações públicas do seu perfil de investidor(a).
        </p>
      </div>

      <Tabs
        label="Seções do perfil"
        idPrefix={TABS_ID}
        tabs={profileTabs(editor.isDirty && activeTab !== "mentoria")}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pill"
      />

      <TabPanel idPrefix={TABS_ID} tab="tese" activeTab={activeTab} className="mt-6">
        {thesis.carregando ? (
          <ProfilePageSkeleton label="Carregando sua tese" />
        ) : (
          <ThesisSummary answers={thesis.dados} />
        )}
      </TabPanel>

      <TabPanel idPrefix={TABS_ID} tab="mentoria" activeTab={activeTab} className="mt-6">
        {content}

        <ContatosForm />
      </TabPanel>

      {activeTab === "mentoria" && editor.isDirty && (
        <PendingChangesBar
          saving={editor.saving}
          error={editor.saveError}
          helperText={editor.summary}
          saveLabel="Salvar perfil"
          onDiscard={editor.discard}
          onSave={() => void editor.save()}
        />
      )}
    </div>
  );
}
