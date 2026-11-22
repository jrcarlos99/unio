import { Building2, PenLine } from "lucide-react";
import OptionGroup from "../../../components/onboarding/OptionGroup";
import SectionCard from "../../../components/onboarding/SectionCard";
import SelectableCard from "../../../components/onboarding/SelectableCard";
import { ESTAGIO_ICONES, SEGMENTO_ICONES } from "../../../components/onboarding/icons";
import { tabIndexRadio } from "../../../components/onboarding/selecao";
import { ESTAGIOS_DETALHADOS, SEGMENTOS_DETALHADOS } from "../../../data/options";
import { TAMANHO_MAX_TEXTO } from "../../../services/perfilFromOnboarding";
import type { PassoStartupProps } from "./tipos";

export default function PassoSegmento({ respostas, atualizar }: PassoStartupProps) {
  return (
    <>
      <SectionCard
        tituloId="nome-titulo"
        titulo="Qual o nome da sua startup?"
        subtitulo="É assim que investidores e mentores vão encontrar a sua startup."
        selo="Obrigatório"
        icone={PenLine}
      >
        <label htmlFor="startup-nome" className="sr-only">Nome da startup</label>
        <input
          id="startup-nome"
          value={respostas.nome}
          maxLength={TAMANHO_MAX_TEXTO}
          autoComplete="organization"
          aria-required="true"
          onChange={(event) => atualizar({ nome: event.target.value })}
          placeholder="Ex.: EcoTech Solutions"
          className="w-full rounded-xl border border-lightgray bg-[#F7F8F5] px-4 py-3 text-sm text-deepgreen outline-none focus:border-deepgreen"
        />
      </SectionCard>
      <SectionCard
        tituloId="segmento-titulo"
        titulo="Qual o segmento da sua startup?"
        subtitulo="Selecione a categoria central em que sua solução atua diretamente."
        selo="Seleção única"
        icone={Building2}
      >
        <OptionGroup
          mode="single"
          labelledBy="segmento-titulo"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {SEGMENTOS_DETALHADOS.map(({ valor, categoria }, indice) => (
            <SelectableCard
              key={valor}
              variant="single"
              icon={SEGMENTO_ICONES[valor]}
              eyebrow={categoria}
              title={valor}
              selected={respostas.segmento === valor}
              tabIndex={tabIndexRadio(respostas.segmento === valor, indice, respostas.segmento !== null)}
              onSelect={() => atualizar({ segmento: valor })}
            />
          ))}
        </OptionGroup>
      </SectionCard>
      <SectionCard
        tituloId="estagio-titulo"
        titulo="Em que estágio ela está?"
        subtitulo="Isso auxilia na calibração de teses de cheques e programas de mentoria adequados."
        selo="Maturidade"
      >
        <OptionGroup mode="single" labelledBy="estagio-titulo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ESTAGIOS_DETALHADOS.map(({ valor, descricao }, indice) => (
            <SelectableCard
              key={valor}
              variant="single"
              icon={ESTAGIO_ICONES[valor]}
              title={valor}
              description={descricao}
              selected={respostas.estagio === valor}
              tabIndex={tabIndexRadio(respostas.estagio === valor, indice, respostas.estagio !== null)}
              onSelect={() => atualizar({ estagio: valor })}
            />
          ))}
        </OptionGroup>
      </SectionCard>
    </>
  );
}
