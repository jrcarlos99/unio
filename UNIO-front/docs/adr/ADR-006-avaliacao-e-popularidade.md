# ADR-006: Avaliação pós-reunião só com nota, popularidade em porcentagem e fluxo "Compareci"

- **Autora:** Carol
- **Data:** 2026-11-16
- **Status:** Aceita
- **Atualiza:** ADR-004 e ADR-005 (`REALIZADA` agora é o status `realizada` do front)
- **Back:** D040 a D044 em `unio/docs/decisoes.md`, migration `V25__create_profile_views.sql`,
  contrato em `unio/docs/contrato/contrato-comunicacao.md` (seções T12 e RF10)

## Contexto

O RF10 pede uma avaliação pós-interação, mas **não define o que fica visível**: nem para quem
foi avaliado, nem para quem visita o perfil. O back já tinha a avaliação (T12: nota de 1 a 5 e
comentário opcional, só para reunião `REALIZADA`, uma por participante) e o `POST /complete`,
mas o front não tinha o status realizada (a ADR-005 tratava `REALIZADA` como uma confirmada no
passado), nem um jeito de marcar presença, nem onde mostrar o resultado.

Faltava decidir: o que é exibido, a partir de quantas avaliações, como a avaliação começa e
como ela influencia a descoberta sem mexer no score de compatibilidade.

## Decisão

1. **Visibilidade (escolha do grupo).** Só a **nota** é visível, e só como **porcentagem**:
   `calcularPercentual(notas) = round(média / 5 * 100)`. O **comentário é opcional, fica
   guardado e não é exibido** em nenhuma tela, lista, tooltip ou notificação, nem para quem
   recebeu. Ele serve à moderação e à melhoria da plataforma (D043 do back). Nada de nomes,
   notas individuais ou lista de quem avaliou.
2. **Mínimo de 3 avaliações.** `MIN_AVALIACOES_EXIBIR = 3` (`utils/popularidade.ts`). Abaixo
   disso o percentual é nulo: o card diz "Ainda sem avaliações suficientes (faltam X)" e os
   selos não aparecem. Mesma regra do back (`visible`, D040).
3. **Fluxo "Compareci".** Depois do **fim** do horário de uma reunião confirmada, o drawer e o
   evento no calendário (com um ponto de atenção) perguntam "A reunião aconteceu?":
   - **Compareci** chama `marcarComoRealizada(id)`, que vale para a reunião inteira, como o
     `POST /api/meetings/{id}/complete`. A reunião vira `realizada` (selo "Realizada" no
     calendário) e é criada a notificação `avaliar` "Avalie a reunião com {nome}" para quem
     clicou. Com a API, a outra parte recebe a mesma notificação quando a lista dela muda de
     confirmada para realizada (`reunioesNotificacoes.ts`).
   - **A reunião não aconteceu** cancela com o motivo "Não aconteceu" (`{ reason }` no
     `POST /cancel`).
4. **Avaliar.** `AvaliarReuniaoModal`: nota de 1 a 5 em botões grandes (radiogroup nativo,
   setas do teclado, `aria-label` "Nota 4 de 5"), comentário opcional com contador de 500
   caracteres (o back aceita 1000) e o aviso de que ele não fica visível. Entradas: a
   notificação do sino (abre o modal ali mesmo), o botão "Avaliar" no drawer da reunião
   realizada e o aviso "1 reunião para avaliar" em Reuniões. A avaliação é sempre do outro
   participante.
5. **Onde aparece.** Card "Popularidade" na Visão geral da startup (grid de 5 cards sem
   buraco), aba somente leitura "Popularidade" no Meu perfil do investidor (popularidade,
   visitas de 28 dias com variação e gráfico semanal, reuniões realizadas, interesses
   recebidos e o texto "Só você vê estes números..."), selo "Popularidade 92%" no perfil visto
   pelo outro lado e selo pequeno nos cards de Descobrir, Investidores, Salvos e Meus unios.
6. **Ordenação: popularidade só desempata.** As listas continuam por compatibilidade.
   `ordenarComPopularidade()` usa como chave `compatibilidade + popularidade / 100 * 5` (bônus
   de no máximo 5 pontos) e, empatando, a maior popularidade. O bônus **nunca** é somado ao
   número de compatibilidade exibido: a função só reordena. O back não ordena por popularidade
   (D042), então isto é só do front.
7. **Modo mock e mapeamento isolado.** `services/avaliacoesService.ts` é o único ponto de
   dados das telas (todas as funções devolvem `Promise`): `listarPendentesDeAvaliacao`,
   `avaliarReuniao` (uma vez, só se realizada), `jaAvaliou`, `obterPopularidade`,
   `obterPopularidadePublica` e `registrarVisitaPerfil`. Hoje é mock, em `localStorage` por
   e-mail (`avaliacoesStore.ts`, `unio_avaliacoes_<email>`, com `try/catch`). O mapeamento para
   a API (`toBackReview`, `fromBackSummary`, `fromBackPopularity`) fica em
   `services/avaliacoes.mapping.ts`, puro e testado, e é reexportado no bloco final do
   serviço com o passo a passo para ligar. Se o back devolver `comment`, o mapeamento descarta.
8. **Dados de exemplo (só no mock).** Para a popularidade sair do zero, cerca de 5 s depois do
   "Compareci" a outra parte "comparece" e avalia você com 5 ou 4 (alternando). Antes disso o
   usuário tem 2 notas de exemplo (abaixo do mínimo), então o primeiro "Compareci" é o que
   faz a porcentagem aparecer. Visitas da startup reaproveitam o `dashboardStartupMock`; as do
   investidor e as notas dos perfis fictícios ficam em `mocks/popularidadeMock.ts`. Os
   exemplos de reunião ganharam uma confirmada que já passou, para testar o fluxo.
9. **Visitas.** `PerfilStartup` e `PerfilInvestidor` chamam `registrarVisitaPerfil(id)` uma vez
   por abertura. No mock é só um contador local; com a API, o back conta uma visita por
   visitante por dia e nunca expõe quem visitou (D041).

## Alternativas

- **Estrelas com média decimal (4,7):** parece mais preciso do que é com poucas avaliações e
  pede estrela obrigatória; a porcentagem conversa com o "% de match" já usado no app.
- **Exibir o comentário ao avaliado:** gera exposição e conflito entre as partes sem ajudar a
  decidir uma reunião. Fica só para moderação.
- **Mostrar a média desde a 1ª avaliação:** numa reunião 1 a 1 a outra parte saberia que a
  nota veio dela, e uma nota isolada marcaria o perfil.
- **Somar a popularidade ao match:** mudaria o número de compatibilidade e quebraria a
  explicação do score. Ficou só como desempate e bônus pequeno de ordenação.
- **Avaliar direto pelo perfil:** sem a reunião não há garantia de interação. O fluxo de
  avaliar é só pela reunião; não há campo de avaliação nas abas do perfil.

## Consequências

- `StatusReuniao` ganhou `realizada`: `fromBackStatus("REALIZADA")` agora devolve
  `realizada` (antes `confirmada`), calendário, drawer, mini calendário e legenda tratam o novo
  status. `TipoNotificacao` ganhou `avaliar`. `cancelarReuniao` aceita um motivo.
- Testes: `tests/popularidade.test.ts` (percentual, mínimo, variação, ordenação) e
  `tests/avaliacoes.mapping.test.ts`; `tests/reunioes.mapping.test.ts` atualizado.
- Pendências: ligar avaliação, popularidade e visitas à API (bloco final de
  `avaliacoesService.ts`); a startup ainda não tem a aba Popularidade no Meu perfil (só o card
  no dashboard); interesse mútuo, popularidade no ranking e notificações continuam
  pendências do back (D039, D042).
- Arquivos novos: `types/avaliacoes.ts`, `utils/popularidade.ts`, `services/avaliacoesService.ts`,
  `services/avaliacoesStore.ts`, `services/avaliacoes.mapping.ts`, `services/popularidadePerfis.ts`,
  `mocks/popularidadeMock.ts`, `hooks/useAvaliacoes.ts`, `components/reunioes/AvaliarReuniaoModal.tsx`,
  `components/popularidade/SeloPopularidade.tsx`, `CardPopularidade.tsx`, `AbaPopularidade.tsx`.
