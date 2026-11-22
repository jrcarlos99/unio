import { useCallback, useRef, useState } from "react";
import { Check, CircleAlert, Clock, Eye, LayoutGrid, Megaphone } from "lucide-react";
import AvisoEstado from "../../components/discovery/AvisoEstado";
import InvestorPreviewCard from "../../components/pitch/InvestorPreviewCard";
import LeanCanvasGrid from "../../components/pitch/LeanCanvasGrid";
import ModerationBanner from "../../components/pitch/ModerationBanner";
import PitchFormCard from "../../components/pitch/PitchFormCard";
import PitchPageSkeleton from "../../components/pitch/PitchPageSkeleton";
import PitchPreviewModal from "../../components/pitch/PitchPreviewModal";
import PitchStatusBadge from "../../components/pitch/PitchStatusBadge";
import PitchTipsCard from "../../components/pitch/PitchTipsCard";
import PublishPendingAlert from "../../components/pitch/PublishPendingAlert";
import { CHIP, OUTLINE_BUTTON, PRIMARY_BUTTON } from "../../components/pitch/styles";
import Tabs, { TabPanel, type TabItem } from "../../components/ui/Tabs";
import { useAuth } from "../../contexts/AuthContext";
import { usePitchEditor, type SubmitPhase } from "../../hooks/usePitchEditor";
import type { PitchFormErrors, PitchTab } from "../../types/pitch";
import { LEAN_CANVAS_FIELDS, formatUpdatedAt, parseVideoUrl } from "../../utils/pitch";

const TABS_ID = "pitch-tabs";

const PHASE_MESSAGE: Record<SubmitPhase, string> = {
  idle: "",
  saving: "Salvando alterações…",
  publishing: "Enviando para moderação…",
};

function profileText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function tabsWithAlerts(errors: PitchFormErrors): TabItem<PitchTab>[] {
  const pitchHasError = Boolean(errors.shortPitch || errors.videoUrl);
  const canvasHasError = LEAN_CANVAS_FIELDS.some((field) => errors[field]);
  return [
    { id: "pitch", label: "Pitch", icon: Megaphone, alert: pitchHasError ? "contém erros" : undefined },
    { id: "canvas", label: "Lean Canvas", icon: LayoutGrid, alert: canvasHasError ? "contém erros" : undefined },
  ];
}

// "Pitch & Lean Canvas" page of the startup (/pitch-canvas). Data and
// actions come from usePitchEditor; API calls from services/pitchService.ts.
export default function PitchCanvas() {
  const { user } = useAuth();
  const editor = usePitchEditor();
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewButtonRef = useRef<HTMLButtonElement>(null);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    previewButtonRef.current?.focus();
  }, []);

  // From GET /api/profile/me (already loaded by AuthContext)
  const startupName = profileText(user?.nome);
  const sector = profileText(user?.segmento);

  const { pitch, values, errors, phase } = editor;
  const updatedAt = formatUpdatedAt(pitch?.updatedAt ?? null);
  const video = values ? parseVideoUrl(values.videoUrl) : null;

  let content;
  if (editor.loading) {
    content = <PitchPageSkeleton />;
  } else if (editor.loadError || !pitch || !values) {
    content = (
      <AvisoEstado
        erro
        icone={CircleAlert}
        titulo="Não foi possível carregar seu pitch"
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
      <>
        <Tabs
          label="Seções do pitch"
          idPrefix={TABS_ID}
          tabs={tabsWithAlerts(errors)}
          activeTab={editor.activeTab}
          onChange={editor.setActiveTab}
        />

        <div className="mt-4 space-y-4">
          <ModerationBanner />
          {editor.publishPending && (
            <PublishPendingAlert
              reason={editor.publishError}
              hasNewChanges={editor.isDirty}
              retrying={phase === "publishing"}
              onRetry={editor.retryPublish}
            />
          )}
        </div>

        <TabPanel idPrefix={TABS_ID} tab="pitch" activeTab={editor.activeTab} className="mt-6 @container">
          {/* Columns by the width of the content (the sidebar already taken
              out): stacked below 896px, form 3/5 + preview 2/5, and from
              1440px form 2/3 + preview 1/3, so the preview keeps the size of
              a feed card */}
          <div className="grid grid-cols-1 gap-6 @[56rem]:grid-cols-5 @[90rem]:grid-cols-3">
            <div className="min-w-0 space-y-6 @[56rem]:col-span-3 @[90rem]:col-span-2">
              <PitchFormCard
                shortPitch={values.shortPitch}
                videoUrl={values.videoUrl}
                errors={errors}
                onChange={editor.setField}
                onBlur={editor.touchField}
              />
              <PitchTipsCard />
            </div>
            <div className="min-w-0 @[56rem]:sticky @[56rem]:top-8 @[56rem]:col-span-2 @[56rem]:self-start @[90rem]:col-span-1">
              <InvestorPreviewCard
                startupName={startupName}
                sector={sector}
                shortPitch={values.shortPitch}
                video={video}
              />
            </div>
          </div>
        </TabPanel>

        <TabPanel idPrefix={TABS_ID} tab="canvas" activeTab={editor.activeTab} className="mt-6">
          <LeanCanvasGrid
            values={values.leanCanvas}
            errors={errors}
            onChange={editor.setField}
            onBlur={editor.touchField}
          />
        </TabPanel>

        {previewOpen && (
          <PitchPreviewModal
            startupName={startupName}
            sector={sector}
            shortPitch={values.shortPitch}
            video={video}
            leanCanvas={values.leanCanvas}
            onClose={closePreview}
          />
        )}
      </>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 border-b border-lightgray pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-deepgreen sm:text-4xl">Pitch &amp; Lean Canvas</h1>
            {pitch && <PitchStatusBadge status={pitch.status} />}
            {editor.isDirty && (
              <span className={`${CHIP} border border-deepgreen/30 bg-white text-deepgreen`}>
                Alterações não publicadas
              </span>
            )}
          </div>
          {updatedAt && (
            <p className="mt-2 flex items-center gap-2 text-sm text-deepgreen/80">
              <Clock size={16} aria-hidden="true" />
              Última atualização: {updatedAt}
            </p>
          )}
        </div>

        {pitch && values && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              ref={previewButtonRef}
              type="button"
              onClick={() => setPreviewOpen(true)}
              aria-haspopup="dialog"
              className={OUTLINE_BUTTON}
            >
              <Eye size={18} aria-hidden="true" />
              Pré-visualizar
            </button>
            <button
              type="button"
              onClick={() => void editor.publish()}
              disabled={!editor.canPublish}
              className={PRIMARY_BUTTON}
            >
              <Check size={18} aria-hidden="true" />
              {phase === "idle" ? "Publicar alterações" : PHASE_MESSAGE[phase]}
            </button>
          </div>
        )}
      </div>

      {/* Progress of save/publish for screen readers; results go to the toasts */}
      <p className="sr-only" role="status" aria-live="polite">
        {PHASE_MESSAGE[phase]}
      </p>

      {content}
    </div>
  );
}
