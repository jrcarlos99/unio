import { FOCO_VISIVEL } from "../onboarding/selecao";

// Classes compartilhadas pelos componentes de Reuniões (só tokens do
// tailwind.config.js: deepgreen, sage, lightgray; vermelho só para ações
// destrutivas e a linha da hora atual, como no resto do app)

export const BOTAO_PRIMARIO = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-deepgreen px-5 text-sm font-bold text-white transition hover:bg-sage hover:text-deepgreen disabled:opacity-70 ${FOCO_VISIVEL}`;

export const BOTAO_SECUNDARIO = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-lightgray bg-white px-5 text-sm font-semibold text-deepgreen transition hover:border-sage disabled:opacity-70 ${FOCO_VISIVEL}`;

export const BOTAO_PERIGO = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-70 ${FOCO_VISIVEL}`;

export const BOTAO_ICONE = `inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-deepgreen transition hover:bg-lightgray ${FOCO_VISIVEL}`;

export const CAMPO = (erro?: boolean) =>
  `min-h-[44px] w-full rounded-2xl border bg-white px-4 text-sm text-deepgreen placeholder:text-deepgreen/50 focus:outline-none focus:ring-2 focus:ring-deepgreen/20 ${
    erro ? "border-red-600" : "border-lightgray focus:border-deepgreen"
  }`;

export const ROTULO = "text-sm font-semibold text-deepgreen";

export const ERRO = "mt-1 text-xs text-red-700";

// Chip selecionável (input radio escondido + label)
export const CHIP = (ativo: boolean) =>
  `inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition peer-focus-visible:ring-2 peer-focus-visible:ring-deepgreen peer-focus-visible:ring-offset-2 ${
    ativo ? "border-deepgreen bg-deepgreen text-white" : "border-lightgray bg-white text-deepgreen hover:border-sage"
  }`;
