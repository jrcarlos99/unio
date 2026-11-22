import {
  Activity,
  Banknote,
  DollarSign,
  Fingerprint,
  Lightbulb,
  Network,
  Sparkles,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { LeanCanvasField } from "../../types/pitch";

export interface LeanCanvasBlock {
  title: string;
  hint: string;
  icon: LucideIcon;
  // Position of the block at each stage of LeanCanvasGrid. The stages follow
  // the width of the canvas container (container queries), not the window:
  //   < 40rem (640px):        1 column, reading order of the canvas
  //   @[40rem] (640px):       2 columns; Customer Segments takes the full row,
  //                           so Costs and Revenue sit side by side at the end
  //   @[64rem] (1024px):      3 columns (6-column grid, blocks span 2); Unique
  //                           Value Proposition takes the full row, Costs and
  //                           Revenue span 3 each
  //   @[80rem] (1280px):      classic canvas on a 10-column grid: 5 blocks of
  //                           2 columns on top (Problem, UVP and Segments span
  //                           2 rows), Costs and Revenue with 5 columns each
  layout: string;
}

export const LEAN_CANVAS_BLOCKS: Record<LeanCanvasField, LeanCanvasBlock> = {
  problem: {
    title: "Problema",
    hint: "Os 3 principais problemas que seu cliente enfrenta hoje.",
    icon: TriangleAlert,
    layout: "@[64rem]:col-span-2 @[80rem]:col-start-1 @[80rem]:row-span-2 @[80rem]:row-start-1",
  },
  solution: {
    title: "Solução",
    hint: "As funcionalidades que resolvem cada problema.",
    icon: Lightbulb,
    layout: "@[64rem]:col-span-2 @[80rem]:col-start-3 @[80rem]:row-start-1",
  },
  keyMetrics: {
    title: "Métricas-Chave",
    hint: "Os números que mostram se o negócio está funcionando.",
    icon: Activity,
    layout: "@[64rem]:col-span-2 @[80rem]:col-start-3 @[80rem]:row-start-2",
  },
  uniqueValueProposition: {
    title: "Proposta de Valor Única",
    hint: "Uma mensagem clara de por que você é diferente.",
    icon: Sparkles,
    layout: "@[64rem]:col-span-6 @[80rem]:col-span-2 @[80rem]:col-start-5 @[80rem]:row-span-2 @[80rem]:row-start-1",
  },
  unfairAdvantage: {
    title: "Vantagem Injusta",
    hint: "O que não pode ser facilmente copiado ou comprado.",
    icon: Fingerprint,
    layout: "@[64rem]:col-span-2 @[80rem]:col-start-7 @[80rem]:row-start-1",
  },
  channels: {
    title: "Canais",
    hint: "Como você chega até os clientes.",
    icon: Network,
    layout: "@[64rem]:col-span-2 @[80rem]:col-start-7 @[80rem]:row-start-2",
  },
  customerSegments: {
    title: "Segmentos de Clientes",
    hint: "Quem são seus clientes-alvo e os primeiros a adotar.",
    icon: Users,
    layout: "@[40rem]:col-span-2 @[80rem]:col-start-9 @[80rem]:row-span-2 @[80rem]:row-start-1",
  },
  costStructure: {
    title: "Estrutura de Custos",
    hint: "Custos fixos e variáveis para operar e adquirir clientes.",
    icon: Banknote,
    layout: "@[64rem]:col-span-3 @[80rem]:col-span-5 @[80rem]:col-start-1 @[80rem]:row-start-3",
  },
  revenueStreams: {
    title: "Fluxos de Receita",
    hint: "Como a startup ganha dinheiro: modelo, preço e recorrência.",
    icon: DollarSign,
    layout: "@[64rem]:col-span-3 @[80rem]:col-span-5 @[80rem]:col-start-6 @[80rem]:row-start-3",
  },
};
