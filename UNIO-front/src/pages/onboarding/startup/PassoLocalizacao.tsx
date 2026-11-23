import { MapPin, Rocket, Users } from "lucide-react";
import Chip from "../../../components/onboarding/Chip";
import OptionGroup from "../../../components/onboarding/OptionGroup";
import SectionCard from "../../../components/onboarding/SectionCard";
import SelectableCard from "../../../components/onboarding/SelectableCard";
import { alternarItem, tabIndexRadio } from "../../../components/onboarding/selecao";
import { TAMANHOS_EQUIPE, TRACOES_STARTUP } from "../../../data/options";
import { TAMANHO_MAX_TEXTO } from "../../../services/perfilFromOnboarding";
import type { PassoStartupProps } from "./tipos";

export default function PassoLocalizacao({ respostas, atualizar }: PassoStartupProps) {
  return (
    <>
      <SectionCard tituloId="localizacao-titulo" titulo="Localização" icone={MapPin}>
        <label htmlFor="startup-localizacao" className="sr-only">Localização da startup</label>
        <div className="flex items-center rounded-2xl border border-lightgray bg-[#F7F8F5] px-4 py-3">
          <MapPin size={18} className="mr-2 shrink-0 text-deepgreen/70" aria-hidden="true" />
          <input
            id="startup-localizacao"
            value={respostas.localizacao}
            maxLength={TAMANHO_MAX_TEXTO}
            onChange={(event) => atualizar({ localizacao: event.target.value })}
            placeholder="Digite a cidade e o estado"
            className="w-full bg-transparent text-sm text-deepgreen outline-none placeholder:text-deepgreen/50"
          />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-deepgreen/60">
          Sugestões no ecossistema
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {["Recife / Porto Digital", "Olinda", "Jaboatão", "Outra cidade de PE", "Outro estado"].map((cidade) => (
            <Chip
              key={cidade}
              label={cidade}
              selected={respostas.localizacao === cidade}
              onToggle={() => atualizar({ localizacao: cidade })}
            />
          ))}
        </div>
      </SectionCard>
      <SectionCard
        tituloId="tracao-titulo"
        titulo="Tração atual"
        subtitulo="Selecione todas que se aplicam."
        icone={Rocket}
      >
        <OptionGroup mode="multiple" labelledBy="tracao-titulo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRACOES_STARTUP.map((tracao) => (
            <SelectableCard
              key={tracao}
              variant="multiple"
              title={tracao}
              selected={respostas.tracao.includes(tracao)}
              onSelect={() => atualizar({ tracao: alternarItem(respostas.tracao, tracao) })}
            />
          ))}
        </OptionGroup>
      </SectionCard>
      <SectionCard tituloId="equipe-titulo" titulo="Tamanho da equipe" icone={Users}>
        <OptionGroup mode="single" labelledBy="equipe-titulo" className="grid grid-cols-2 overflow-hidden rounded-2xl border border-lightgray bg-[#F7F8F5] sm:grid-cols-4">
          {TAMANHOS_EQUIPE.map((tamanho, indice) => (
            <button
              key={tamanho}
              type="button"
              role="radio"
              aria-checked={respostas.tamanhoEquipe === tamanho}
              tabIndex={tabIndexRadio(respostas.tamanhoEquipe === tamanho, indice, respostas.tamanhoEquipe !== null)}
              onClick={() => atualizar({ tamanhoEquipe: tamanho })}
              className={`px-3 py-3 text-sm font-medium transition ${respostas.tamanhoEquipe === tamanho ? "bg-deepgreen text-white" : "text-deepgreen hover:bg-white"}`}
            >
              {tamanho}
            </button>
          ))}
        </OptionGroup>
      </SectionCard>
    </>
  );
}
