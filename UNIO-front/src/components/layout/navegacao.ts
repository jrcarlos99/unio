import {
  Bookmark,
  CalendarDays,
  Compass,
  FileWarning,
  History,
  LayoutDashboard,
  MessageSquare,
  User,
  UserCheck,
  Users,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import type { PerfilApp } from "../../types/recomendacoes";

export type { PerfilApp };

// Perfis que usam o AppLayout: os dois do app e o administrador (ADR-014).
// PerfilApp continua só com investidor e startup, porque é o perfil das
// regras de negócio (reuniões, salvos, unios).
export type PerfilLayout = PerfilApp | "admin";

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
  // Ativo só na rota exata (ex.: "/admin" não fica ativo em "/admin/cadastros")
  end?: boolean;
}

export interface ConfigPerfil {
  selo: string;
  // Nome da navegação para leitores de tela
  rotuloMenu: string;
  // Texto abaixo do nome no rodapé quando o perfil não traz um
  cargoPadrao: string;
  home: string;
  itens: ItemMenu[];
  // Link do menu do rodapé para revisar as respostas do onboarding (o
  // administrador não tem onboarding)
  revisar?: { to: string; rotulo: string };
}

const COMUNS: ItemMenu[] = [
  { to: "/salvos", rotulo: "Salvos", icone: Bookmark },
  { to: "/meus-unios", rotulo: "Meus unios", icone: MessageSquare },
  { to: "/reunioes", rotulo: "Reuniões", icone: CalendarDays, contador: "solicitacoesReuniao" },
  { to: "/meu-perfil", rotulo: "Meu perfil", icone: User },
];

export const CONFIG_PERFIL: Record<PerfilLayout, ConfigPerfil> = {
  investidor: {
    selo: "INVESTIDOR",
    rotuloMenu: "Menu do investidor",
    cargoPadrao: "Investidor Anjo",
    home: "/home-investidor",
    itens: [{ to: "/home-investidor", rotulo: "Descobrir", icone: Compass }, ...COMUNS],
    revisar: { to: "/onboarding/investidor?passo=1", rotulo: "Revisar minha tese" },
  },
  startup: {
    selo: "STARTUP",
    rotuloMenu: "Menu da startup",
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
  // Painel do administrador (ADR-013 e ADR-014): mesmas posições e mesmo
  // visual; sem contador de reuniões nem onboarding
  admin: {
    selo: "ADMIN",
    rotuloMenu: "Menu do administrador",
    cargoPadrao: "Administrador da plataforma",
    home: "/admin",
    itens: [
      { to: "/admin", rotulo: "Visão geral", icone: LayoutDashboard, end: true },
      { to: "/admin/cadastros", rotulo: "Cadastros", icone: UserCheck },
      { to: "/admin/conteudo", rotulo: "Moderação de conteúdo", icone: FileWarning },
      { to: "/admin/auditoria", rotulo: "Log de auditoria", icone: History },
    ],
  },
};

// Perfil das regras de negócio: qualquer papel que não seja startup cai no
// investidor (o admin não usa reuniões, salvos nem gates de onboarding)
export function perfilDoPapel(papel: string | undefined): PerfilApp {
  return papel === "startup" ? "startup" : "investidor";
}

// Perfil do AppLayout e da AppSidebar: o admin tem a própria navegação
export function perfilDoLayout(papel: string | undefined): PerfilLayout {
  return papel === "admin" ? "admin" : perfilDoPapel(papel);
}
