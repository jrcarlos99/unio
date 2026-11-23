import { Check, DollarSign } from "lucide-react";
import ConsentCheckbox from "../../../components/onboarding/ConsentCheckbox";
import InfoNote from "../../../components/onboarding/InfoNote";
import OptionGroup from "../../../components/onboarding/OptionGroup";
import SectionCard from "../../../components/onboarding/SectionCard";
import SelectableCard from "../../../components/onboarding/SelectableCard";
import { tabIndexRadio } from "../../../components/onboarding/selecao";
import { MODELOS_NEGOCIO, SUGESTOES_MERCADO_ALVO } from "../../../data/options";
import { TAMANHO_MAX_TEXTO } from "../../../services/perfilFromOnboarding";
import type { PassoStartupProps } from "./tipos";

export default function PassoModelo({ respostas, atualizar }: PassoStartupProps) {
  const mercadoDigitado = respostas.mercadoAlvo;
  return (
    <>
      <SectionCard tituloId="modelo-titulo" titulo="Modelo de negócio" subtitulo="Selecione o modelo principal de monetização e receita da operação." selo="Seleção única" icone={DollarSign}>
        <OptionGroup mode="single" labelledBy="modelo-titulo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODELOS_NEGOCIO.map((modelo, indice) => (
            <SelectableCard
              key={modelo}
              variant="single"
              title={modelo}
              selected={respostas.modeloNegocio === modelo}
              tabIndex={tabIndexRadio(respostas.modeloNegocio === modelo, indice, respostas.modeloNegocio !== null)}
              onSelect={() => atualizar({ modeloNegocio: modelo })}
            />
          ))}
        </OptionGroup>
      </SectionCard>
      <SectionCard tituloId="mercado-titulo" titulo="Mercado-alvo" subtitulo="Descreva os clientes ideais ou o segmento específico atendido pelo produto.">
        <label htmlFor="mercado-alvo" className="sr-only">Mercado-alvo</label>
        <input
          id="mercado-alvo"
          value={mercadoDigitado}
          maxLength={TAMANHO_MAX_TEXTO}
          onChange={(event) => atualizar({ mercadoAlvo: event.target.value })}
          className="w-full rounded-xl border border-lightgray bg-[#F7F8F5] px-4 py-3 text-sm text-deepgreen outline-none focus:border-deepgreen"
          placeholder="Ex.: Pequenas e médias empresas do varejo"
        />
        <p className="mt-3 text-xs text-deepgreen/60">Sugestões rápidas:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGESTOES_MERCADO_ALVO.map((sugestao) => (
            <ChipSuggestion
              key={sugestao}
              label={sugestao}
              selected={mercadoDigitado === sugestao}
              onClick={() => atualizar({ mercadoAlvo: sugestao })}
            />
          ))}
        </div>
      </SectionCard>
      <SectionCard tituloId="pitch-titulo" titulo="Pitch em uma frase" subtitulo="Este resumo será a primeira linha exibida no feed dos investidores." selo="Opcional">
        <label htmlFor="startup-pitch" className="sr-only">Pitch em uma frase</label>
        <textarea
          id="startup-pitch"
          maxLength={140}
          value={respostas.pitch}
          onChange={(event) => atualizar({ pitch: event.target.value })}
          className="min-h-28 w-full resize-y rounded-xl border border-lightgray bg-[#F7F8F5] px-4 py-3 text-sm text-deepgreen outline-none focus:border-deepgreen"
          placeholder="Resuma o que a sua startup faz em uma frase"
        />
        <p className="mt-1 text-right text-xs text-deepgreen/60">{respostas.pitch.length}/140</p>
      </SectionCard>
      <ConsentCheckbox
        id="consentimento-startup"
        assunto="estas informações"
        checked={respostas.consentimentoLgpd}
        onChange={(valor) => atualizar({ consentimentoLgpd: valor })}
      />
      <InfoNote>Quase lá! Você poderá completar o Canvas do pitch depois, direto no seu perfil.</InfoNote>
    </>
  );
}

function ChipSuggestion({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selected ? "border-deepgreen bg-deepgreen text-white" : "border-lightgray bg-[#F6F7F4] text-deepgreen hover:border-sage"}`}
    >
      {selected ? <Check size={12} className="mr-1 inline" /> : "+"} {label}
    </button>
  );
}
