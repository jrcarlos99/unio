# ADR-009: Reunião só com match nos dois modos, contato só por e-mail e dashboard com dados reais

- **Autora:** Carol
- **Data:** 2026-11-16
- **Status:** Aceita; modo mock substituído pela ADR-011.
- **Atualiza:**
  - ADR-005 (a pendência "match mútuo no back" foi resolvida);
  - ADR-007 (interessados, matches, a etapa de interesse e os investidores recomendados
    deixam de ser exemplo).
- **Back:** D051 (reunião só com match, substitui parcialmente a D028), D052 (e-mail só
  depois do match) e D053 (métricas)

> **Nota (2026-11-20, Carol):** o modo mock (contatos locais, "Contatos iniciados" e números de exemplo do dashboard) deixou de existir. Substituída pela [ADR-011](ADR-011-producao-sem-mocks.md) nesse ponto; o resto desta ADR fica como histórico.

## Contexto

Até aqui, a regra "reunião só com quem deu match" valia apenas no mock
(`REUNIOES_EXIGEM_MATCH = MOCK_BACKEND`), porque o back não tinha match. Com a D051, o back
faz duas coisas:

- recusa `POST /api/meetings` sem match, com 403 e a mensagem "Vocês precisam dar match
  (interesse mútuo) para marcar uma reunião";
- lista em `GET /api/meetings/counterparts` só quem deu match.

O popup do unio mostrava WhatsApp, e-mail e telefone de exemplo. A seção "Contatos para
matches" do Meu perfil gravava esses canais no navegador.

## Decisão

1. **`REUNIOES_EXIGEM_MATCH = true` nos dois modos.**
   - "Com quem" usa as contrapartes que o back já filtrou.
   - Sem match, a página de reuniões e o modal mostram "Dê match com alguém para solicitar
     uma reunião." com um link: "Ir para Descobrir" para o investidor, "Ir para
     Investidores" para a startup.
   - O erro 403 do back aparece como veio, por `getApiErrorMessage`.
2. **Contato depois do match: só e-mail (modo API).**
   - O popup usa `contact.email` de `/api/interests/matches`.
   - Telefone e WhatsApp não existem no back. Os botões desses canais não aparecem, porque o
     `ContatoCard` já esconde canal sem dado.
   - No Meu perfil, o formulário de telefone e WhatsApp passa a aparecer só no mock. No modo
     API, a seção diz que quem der match recebe o e-mail da conta, e só depois do match.
     Gravar esses canais no navegador enganaria o usuário, porque o outro lado nunca os
     veria.
3. **Dashboard da startup (Visão geral) no modo API.**

   | Dado | Fonte |
   | --- | --- |
   | Investidores interessados e a etapa "Demonstraram interesse" do funil | `interestsReceived` de `/api/profile/me/popularity` |
   | Matches | Matches mútuos de `/api/interests/matches` |
   | Investidores recomendados | Os três com maior score da lista real |

   - Os investidores recomendados não levam mais o selo "Dados de exemplo".
   - Visualizações, gráfico e reuniões já vinham do back (ADR-007).
   - Se uma chamada falhar, aquele bloco volta ao mock com o selo, como antes.
   - Continuam de exemplo, sem dado no back: "+N novos esta semana" e o benchmark do funil.
     O rodapé dos interessados vira "demonstraram interesse em você".
4. **Aba Popularidade do investidor.** Os interesses recebidos são reais. Sai o texto "a
   plataforma ainda não registra interesses" (ADR-007).

## Alternativas

- **Manter a regra só no mock.** Deixaria o front prometer algo que o back não cumpria.
  Agora os dois cumprem.
- **Esconder o "Solicitar reunião" sem match.** O botão fica, e a orientação diz o que
  fazer.
- **Mostrar o formulário de telefone no modo API.** Descartado: o dado não chegaria a
  ninguém.

## Consequências

- **Arquivos alterados:**
  - `services/reunioesService.ts` (`ORIENTACAO_SEM_MATCH`, `linkParaDarMatch`)
  - `components/reunioes/SolicitarReuniaoModal.tsx`, `pages/shared/PaginaReunioes.tsx`
  - `components/unios/UnioModal.tsx`, `components/unios/ContatosForm.tsx`
  - `services/dashboardStartup.mapping.ts`, `services/dashboardStartupService.ts`,
    `pages/startup/VisaoGeral.tsx`
  - `components/popularidade/AbaPopularidade.tsx`, comentário em
    `services/avaliacoes.mapping.ts`
  - `tests/dashboardStartup.mapping.test.ts`
- **Pendências para o squad:**
  - Telefone e WhatsApp opcionais no perfil do back, com o texto LGPD da D052.
  - Variação semanal dos interessados.
