import {
  Bookmark,
  CalendarDays,
  Compass,
  LayoutDashboard,
  MessageSquare,
  User,
  Users,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import type { PerfilApp } from "../../types/recomendacoes";

export type { PerfilApp };

// Configuração da sidebar compartilhada (AppSidebar) por perfil. Mesmo
// visual e mesmas posições para os dois: "Visão geral"/"Investidores" da
// startup ocupam o lugar de "Descobrir" do investidor; "Salvos", "Meus
// unios", "Reuniões" e "Meu perfil" são as mesmas rotas, com conteúdo por
// perfil.
//
// Antes do match não há conversa: por isso não existe "Conversas" nem
// "Solicitar Intro" — o contato acontece em "Meus unios".

export interface ItemMenu {
  to: string;
  rotulo: string;
  icone: LucideIcon;
  // Bolinha com número ao lado do rótulo (ex.: solicitações de reunião)
  contador?: "solicitacoesReuniao";
}

export interface ConfigPerfil {
  selo: string;
  // Texto abaixo do nome no rodapé quando o perfil não traz um
  cargoPadrao: string;
  home: string;
  itens: ItemMenu[];
  // Link do menu do rodapé para revisar as respostas do onboarding
  revisar: { to: string; rotulo: string };
}

const COMUNS: ItemMenu[] = [
  { to: "/salvos", rotulo: "Salvos", icone: Bookmark },
  { to: "/meus-unios", rotulo: "Meus unios", icone: MessageSquare },
  { to: "/reunioes", rotulo: "Reuniões", icone: CalendarDays, contador: "solicitacoesReuniao" },
  { to: "/meu-perfil", rotulo: "Meu perfil", icone: User },
];

export const CONFIG_PERFIL: Record<PerfilApp, ConfigPerfil> = {
  investidor: {
    selo: "INVESTIDOR",
    cargoPadrao: "Investidor Anjo",
    home: "/home-investidor",
    itens: [{ to: "/home-investidor", rotulo: "Descobrir", icone: Compass }, ...COMUNS],
    revisar: { to: "/onboarding/investidor?passo=1", rotulo: "Revisar minha tese" },
  },
  startup: {
    selo: "STARTUP",
    cargoPadrao: "Fundador & CEO",
    home: "/home-startup",
    itens: [
      { to: "/home-startup", rotulo: "Visão geral", icone: LayoutDashboard },
      { to: "/investidores", rotulo: "Investidores", icone: Users },
      ...COMUNS,
      // Right after "Meu perfil" (last item of COMUNS), as in the Figma
      { to: "/pitch-canvas", rotulo: "Pitch & Canvas", icone: Megaphone },
    ],
    revisar: { to: "/onboarding/startup?passo=1", rotulo: "Revisar meu onboarding" },
  },
};

// Admin nunca usa o AppLayout; qualquer outro papel cai no investidor
export function perfilDoPapel(papel: string | undefined): PerfilApp {
  return papel === "startup" ? "startup" : "investidor";
}
