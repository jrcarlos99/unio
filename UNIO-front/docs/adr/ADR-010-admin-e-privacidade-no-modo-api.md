# ADR-010: Admin com métricas e auditoria do back; privacidade e dados no Meu perfil

- **Autora:** Carol
- **Data:** 2026-11-16
- **Status:** Aceita
- **Back:** D053 (métricas novas), D054 (primeiro administrador e bootstrap no corpo), D055
  e T13 (exportar e excluir conta)

## Contexto

As telas do admin usavam só dados de exemplo (`pages/admin/data/mockAdmin.ts`), e o log de
auditoria ficava na memória da sessão. O back tem dois endpoints para isso:

- `GET /api/admin/metrics`;
- `GET /api/admin/audit`, com as 50 entradas mais recentes.

Não existia conta ADMIN: a D054 resolve, com as variáveis de ambiente do back.

Os endpoints de LGPD (`GET /api/privacy/export` e `POST /api/privacy/delete-account`)
existiam no back, mas não havia tela para eles.

## Decisão

1. **Visão geral do admin (modo API):** usa `GET /api/admin/metrics`, por
   `services/adminService.ts` e `services/admin.mapping.ts` (função pura).

   | Bloco | Dado |
   | --- | --- |
   | Cards do topo | Matches mútuos, interesses enviados e reuniões |
   | Medidor | Avaliação média das reuniões |
   | Rosca | Reuniões por status |
   | Barras | Scores por classificação |
   | Destaque | Startups e investidores com perfil |

   - O back não tem histórico, então os cards não mostram variação nem sparkline. Esses
     campos ficaram opcionais no tipo `Metrica`.
   - Bloco sem dados mostra "Nenhuma reunião marcada ainda" ou "Nenhum score calculado
     ainda".
2. **Log de auditoria (modo API):** usa `GET /api/admin/audit`. No mock continua o log da
   sessão (`AuditContext`).
3. **Moderação de cadastros:**
   - A lista já vinha de `GET /api/admin/users`.
   - Aprovar e rejeitar não têm endpoint, então ganharam um aviso visível: a ação não fica
     salva e o status volta para Pendente ao recarregar.
4. **Moderação de conteúdo:** continua com dados de exemplo e ganhou um aviso visível
   (`pages/admin/components/AvisoPendencia.tsx`).
5. **Privacidade e dados (Fase 5):** nova seção no Meu perfil da startup e do investidor
   (`components/profile/PrivacidadeDados.tsx`, `services/privacidadeService.ts`).
   - **Exportar meus dados:** baixa o JSON de `GET /api/privacy/export`.
   - **Excluir minha conta:** confirmação em duas etapas.
     - Etapa 1: aviso de que a ação é irreversível e do que é apagado.
     - Etapa 2: a senha.
     - Depois chama `POST /api/privacy/delete-account` com `{ password, confirmed: true }`,
       sai da conta e volta para a página inicial.
   - A seção só aparece no modo API, porque o mock não tem esses endpoints.
   - O back não mudou.
6. O modo mock continua igual em todas as telas do admin.

## Alternativas

- **Inventar variação e sparkline a partir dos totais.** Descartado: seria dado falso.
- **Esconder as telas de moderação no modo API.** Elas ficam, com o aviso, porque a lista
  de usuários é real e ajuda na demonstração.

## Consequências

- **Arquivos novos:**
  - `services/admin.mapping.ts`, `services/adminService.ts`
  - `services/privacidadeService.ts`
  - `components/profile/PrivacidadeDados.tsx`
  - `pages/admin/components/AvisoPendencia.tsx`
  - `tests/admin.mapping.test.ts`
- **Arquivos alterados:**
  - `pages/admin/pages/VisaoGeral.tsx`, `pages/admin/pages/LogAuditoria.tsx`,
    `pages/admin/pages/ModeracaoCadastros.tsx`, `pages/admin/pages/ModeracaoConteudo.tsx`
  - `pages/admin/components/MetricCard.tsx`, `pages/admin/types.ts`
  - `pages/startup/StartupProfile.tsx`, `pages/investidor/InvestorProfile.tsx`
- **Como entrar como admin no modo API:**
  1. Definir `UNIO_ADMIN_EMAIL` e `UNIO_ADMIN_PASSWORD` no ambiente do back.
  2. Reiniciar o back.
  3. Entrar pelo login normal. O destino `/admin` já existia.
- **Pendências para o squad:**
  - Endpoints de moderação (aprovar e rejeitar cadastros, remover conteúdo).
  - Histórico das métricas, para variação e sparkline.
