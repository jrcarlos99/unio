import { useState } from "react";
import { Building2, CircleAlert, Eye, FileText, Users } from "lucide-react";
import AvisoEstado from "../../components/discovery/AvisoEstado";
import { OUTLINE_BUTTON } from "../../components/pitch/styles";
import CompanyDataCard from "../../components/profile/CompanyDataCard";
import DocumentsSection from "../../components/profile/documents/DocumentsSection";
import PendingChangesBar from "../../components/profile/PendingChangesBar";
import ProfileCardPreview from "../../components/profile/ProfileCardPreview";
import ProfilePageSkeleton from "../../components/profile/ProfilePageSkeleton";
import TeamSection from "../../components/profile/team/TeamSection";
import ProfileStatusBadge from "../../components/profile/visibility/ProfileStatusBadge";
import VisibilitySection from "../../components/profile/visibility/VisibilitySection";
import Tabs, { TabPanel, type TabItem } from "../../components/ui/Tabs";
import ContatosForm from "../../components/unios/ContatosForm";
import { useStartupDocuments } from "../../hooks/useStartupDocuments";
import { useProfileVisibility } from "../../hooks/useProfileVisibility";
import { useStartupProfileEditor } from "../../hooks/useStartupProfileEditor";
import { useStartupTeam } from "../../hooks/useStartupTeam";

type ProfileTab = "dados" | "equipe" | "documentos" | "visibilidade";

const TABS_ID = "perfil-tabs";

function profileTabs(teamCount: number | null, documentCount: number | null, unsavedTabs: ProfileTab[]): TabItem<ProfileTab>[] {
  const alert = (tab: ProfileTab) => (unsavedTabs.includes(tab) ? "alterações não salvas" : undefined);
  return [
    { id: "dados", label: "Dados gerais", icon: Building2, alert: alert("dados") },
    { id: "equipe", label: teamCount ? `Equipe (${teamCount})` : "Equipe", icon: Users },
    { id: "documentos", label: documentCount ? `Documentos (${documentCount})` : "Documentos", icon: FileText },
    { id: "visibilidade", label: "Visibilidade", icon: Eye, alert: alert("visibilidade") },
  ];
}

export default function StartupProfile() {
  const editor = useStartupProfileEditor();
  const { saved, values, errors } = editor;
  const [activeTab, setActiveTab] = useState<ProfileTab>("dados");
  const team = useStartupTeam();
  const documents = useStartupDocuments();
  const visibility = useProfileVisibility();
  const savedName = saved?.nome.trim();

  const unsavedTabs = (
    [
      ["dados", editor.isDirty],
      ["visibilidade", visibility.isDirty],
    ] as const
  )
    .filter(([tab, dirty]) => dirty && tab !== activeTab)
    .map(([tab]) => tab);

  let content;
  if (editor.loading) {
    content = <ProfilePageSkeleton />;
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
        <div className="min-w-0 lg:col-span-3">
          <CompanyDataCard
            values={values}
            saved={saved}
            errors={errors}
            onChange={editor.setField}
            onBlur={editor.touchField}
          />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <ProfileCardPreview values={values} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 border-b border-lightgray pb-5">
        <p className="text-xs font-bold uppercase tracking-wider text-deepgreen/75">Configurações institucionais</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-3xl font-bold text-deepgreen sm:text-4xl">Meu Perfil</h1>
          {visibility.saved && <ProfileStatusBadge status={visibility.saved.status} />}
        </div>
        <p className="mt-2 max-w-2xl text-deepgreen/80">
          Gerencie as informações públicas e cadastrais {savedName ? `da ${savedName}` : "da sua startup"}.
        </p>
      </div>

      <Tabs
        label="Seções do perfil"
        idPrefix={TABS_ID}
        tabs={profileTabs(team.count, documents.count, unsavedTabs)}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pill"
      />

      <TabPanel idPrefix={TABS_ID} tab="dados" activeTab={activeTab} className="mt-6">
        {content}

        <ContatosForm />
      </TabPanel>
      
       <TabPanel idPrefix={TABS_ID} tab="equipe" activeTab={activeTab} className="mt-6">
        <TeamSection team={team} startupName={savedName ?? ""} />
      </TabPanel>

      <TabPanel idPrefix={TABS_ID} tab="documentos" activeTab={activeTab} className="mt-6">
        <DocumentsSection documents={documents} />
      </TabPanel>

     <TabPanel idPrefix={TABS_ID} tab="visibilidade" activeTab={activeTab} className="mt-6">
        <VisibilitySection
          visibility={visibility}
          profile={saved}
          profileLoading={editor.loading}
          teamCount={team.count}
          documentCount={documents.count}
        />
      </TabPanel>

      {activeTab === "dados" && editor.isDirty && (
        <PendingChangesBar
          saving={editor.saving}
          error={editor.saveError}
          onDiscard={editor.discard}
          onSave={() => void editor.save()}
        />
      )}
      {activeTab === "visibilidade" && visibility.isDirty && (
        <PendingChangesBar
          saving={visibility.saving}
          error={visibility.saveError}
          onDiscard={visibility.discard}
          onSave={() => void visibility.save()}
        />
      )}
    </div>
  );
}
