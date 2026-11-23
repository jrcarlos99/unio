# ADR-015: Interesses recebidos no sino, nos cards e no perfil

- **Autora:** Carol
- **Data:** 2026-11-22
- **Status:** Aceita
- **Relacionadas:** ADR-005 (notificações de reunião derivadas), ADR-008 (descoberta e interesse), ADR-011 (sem mocks), D049, D052, D063 e D065 do back

## Contexto

Quem recebia um "Tenho interesse" não ficava sabendo. O sino (`SinoNotificacoes`) só
mostrava reuniões e avaliações, e os cards e perfis tratavam o `RECEIVED` da descoberta como
"nenhum" (`statusInteresseDoBack`), com o mesmo botão "Tenho interesse" de sempre. Sem esse
aviso, a pessoa não retribuía e o match não acontecia.

O back passou a ter `GET /api/interests/received` e `GET /api/interests/received/count`
(D065). Retribuir continua sendo `PUT /api/interests/{id}`, que já vira match quando o outro
lado tinha demonstrado.

## Decisão

1. **Serviço e mapeamento próprios.** `services/interessesRecebidosService.ts` chama as duas
   rotas novas e retribui pelo `PUT` de sempre. O JSON do back só é lido em
   `services/interessesRecebidos.mapping.ts` (funções puras: item, texto, link do perfil,
   visto, mensagem de erro). Tipos em `types/interesses.ts`.
2. **Sino.** Uma seção "Interesses recebidos" acima das reuniões:
   - O texto é "A startup X demonstrou interesse em você" ou "O investidor X demonstrou
     interesse em você", com o segmento, o estágio e há quanto tempo. Clicar abre o perfil
     (`/startups/{id}` ou `/investidores/{id}`).
   - O botão "Também tenho interesse" fica na própria notificação. Se der match, aparece
     "Deu match com X! Veja em Meus unios", com link para o unio, e a notificação sai da
     lista. Erros aparecem logo abaixo do botão, com mensagem amigável: 404 para perfil que
     não está mais disponível, 409 para quem ainda não criou o perfil, e uma mensagem padrão
     para o resto.
   - Estados: "Carregando interesses...", "Nenhum interesse novo." e erro com "Tentar
     novamente".
   - O ponto do sino soma as reuniões não lidas e os interesses não vistos.
3. **Visto no navegador.** O registro fica por usuário em
   `unio_interesses_vistos_{e-mail}`, como as notificações de reunião (ADR-005), sem
   migration.
   - A chave de cada interesse é `id@data`: se a pessoa desfizer e demonstrar de novo, o
     interesse volta a ser novo.
   - Abrir o sino marca a lista como vista e guarda só o que ainda está nela.
   - O que passou da primeira página (20 itens) conta como não visto.
4. **Atualização sem polling agressivo** (`hooks/useInteressesRecebidos.ts`):
   - A lista é buscada ao entrar na tela e ao reabrir o sino.
   - A cada 60 segundos, e ao voltar para a aba, só com a aba visível, o hook busca a
     contagem leve. Se o total mudou, baixa a lista de novo.
   - Não há websocket.
5. **Etiqueta e faixa sem chamada por card.** A descoberta, o detalhe, os salvos e Meus
   unios já devolvem `interestStatus: RECEIVED`.
   - O mapeamento ganhou `interesseRecebidoDoBack` e o campo `interesseRecebido` nos itens.
     `statusInteresseDoBack` e o teste dele não mudaram.
   - Os cards mostram a etiqueta "Demonstrou interesse em você" (borda e fundo `sage`, como
     os selos do card), e o botão vira "Também tenho interesse".
   - No perfil, uma faixa no topo diz "O investidor X demonstrou interesse em você" e traz o
     botão "Também tenho interesse". O botão do cabeçalho do perfil troca para o mesmo texto.
6. **Sino e listas em dia.** O serviço avisa cada retribuição (`assinarRetribuicoes`).
   - `useAcoesRecomendacao` aplica o novo estado no card ou no perfil daquela pessoa e avisa
     o sino quando a retribuição sai de um card.
   - Os perfis passaram a conferir o id antes de aplicar uma alteração, porque agora o aviso
     pode ser de outra pessoa.
7. **Visão geral da startup.** "Investidores interessados" continua com o total real da
   popularidade (todos os interesses recebidos, inclusive os que viraram match), que alimenta
   também o funil. O rodapé acrescenta "N aguardam sua resposta", com a contagem da rota
   nova. Se a contagem falhar, volta ao texto de antes. A Home do investidor não tinha
   indicador de interessados e continua sem.

## Alternativas

- **Usar só a rota nova para a etiqueta dos cards:** seria uma chamada a mais por tela para
  saber algo que a descoberta já devolve no mesmo item. Rejeitada; a rota nova serve ao sino.
- **Pôr quem demonstrou interesse no topo de Descobrir e Investidores:** a ordem dessas
  listas é a do score com o desempate da popularidade (ADR-006), e o selo "Melhor match"
  depende dela. Rejeitada; a etiqueta e o sino já destacam essas pessoas sem mudar a ordem.
- **Trocar `StatusInteresse` para ter "recebido":** mudaria o tipo usado por reuniões, salvos
  e Meus unios, e o teste existente de `statusInteresseDoBack`. Rejeitada; foi criado o campo
  `interesseRecebido`.
- **Guardar o visto no back:** precisaria de tabela e migration. Fica como pendência P3 da
  auditoria, junto com as notificações de reunião.

## Consequências

- Arquivos novos: `types/interesses.ts`, `services/interessesRecebidos.mapping.ts`,
  `services/interessesRecebidosService.ts`, `hooks/useInteressesRecebidos.ts`,
  `tests/interessesRecebidos.mapping.test.ts` e `tests/interessesRecebidos.http.test.ts`.
- Arquivos alterados:
  - Sino: `SinoNotificacoes`.
  - Cards e perfil: `RecommendationCard`, `StartupCard`, `InvestorCard`, `InteresseButton`,
    `FaixaStatusInteresse`, `PerfilStartup` e `PerfilInvestidor`.
  - Estado e mapeamento: `useRecomendacoes`, `discovery.mapping`, `types/discovery`,
    `types/investidores` e `types/recomendacoes`.
  - Visão geral da startup: `pages/startup/VisaoGeral`.
  - Testes: `tests/fixtures/respostasBack.ts` (só um acréscimo no fim).
- O visto não acompanha a pessoa entre aparelhos ou navegadores. É o mesmo limite das
  notificações de reunião.
- No perfil, o botão aparece duas vezes, na faixa e no cabeçalho. As duas chamam a mesma
  ação.
- Auditoria front x back atualizada (`docs/integracao/auditoria-front-back.md`).
