# ADR-007: Só ids reais vão ao back; avaliação, popularidade, gate de onboarding e dashboard no modo API

- **Autora:** Carol
- **Data:** 2026-11-16
- **Status:** Aceita
- **Atualiza:** ADR-006 (avaliação e popularidade agora chamam o back no modo API) e ADR-001
  (gate de onboarding)
- **Back:** sem mudança no back. Usa D040 a D044 (avaliação, popularidade e visitas), D032 a
  D039 (reuniões) e o `PUT /api/profile/onboarding` já existente

## Contexto

O relatório de estado de 2026-11-16 apontou cinco riscos para usar o front com o back real
(`VITE_MOCK_BACKEND` diferente de `"true"`):

1. Avaliação e popularidade só em `localStorage`, embora o back já tivesse os endpoints.
2. "Solicitar reunião" aberto pelo popup do unio mandava um slug de mock como
   `participantId` (`Number("biopay")`, NaN), e o back respondia 400.
3. O gate de onboarding lia o status só do `localStorage`: em outro navegador, uma conta com
   perfil voltava para o wizard.
4. O dashboard da startup trocava contagens reais iguais a 0 pelos números do mock e não
   dizia o que era exemplo.
5. "Esqueceu a senha?" era um link para `#`.

O motivo de fundo é o mesmo: Descobrir, Investidores e os perfis abertos a partir deles ainda
usam perfis de exemplo, com ids em texto (`biopay`, `marcos-andrade`), que não existem no
back. Reuniões, avaliações e visitas usam ids numéricos reais.

## Decisão

1. **Regra de ouro: só ids numéricos reais vão ao back.** `utils/idsBack.ts`
   (`paraIdDoBack`, `ehIdDoBack`) aceita só inteiro positivo, escrito só com dígitos. Id de
   exemplo nunca vira chamada HTTP e nunca vira `NaN` ou `null` num corpo:
   - **Visita ao perfil:** id de exemplo não é enviado.
   - **Popularidade pública:** id de exemplo continua lendo o mock (`popularidadePerfis.ts`).
   - **Reunião:** `paraMeetingCreateRequest` usa `idDoParticipante`, que lança `ErroReunioes`
     com "Escolha um usuário cadastrado da lista." antes de qualquer requisição.
2. **Avaliação e popularidade no modo API** (`services/avaliacoesService.ts`, mesmas funções
   e tipos; o modo mock não muda):
   - **Avaliar:** `POST /api/meetings/{id}/reviews`. O comentário vai e nunca volta.
     "Você já avaliou" (409, ou 400 com a mensagem do back) marca a reunião como avaliada e
     mostra essa frase. Outros erros usam `getApiErrorMessage`.
   - **Pendentes e "já avaliei":** reuniões `REALIZADA` do `GET /api/meetings`.
     - Para cada uma (até 20, as mais recentes) o front chama `GET /api/meetings/{id}/reviews`.
     - É minha a avaliação cujo `reviewer.id` é o id do usuário logado. Sem esse id, conta a
       avaliação feita sobre a outra parte.
     - O resultado fica em cache em memória por usuário e é atualizado depois de avaliar.
     - Se a consulta de uma reunião falhar, ela fica fora dos pendentes, sem aviso falso.
   - **Popularidade própria:** `GET /api/profile/me/popularity`. `weeklyViews` vira a série
     do gráfico. `interestsReceived` vem 0, porque o interesse mútuo não existe no back
     (D039, D042); a aba do investidor mostra 0 com o texto "a plataforma ainda não registra
     interesses".
   - **Popularidade pública:** `GET /api/reviews/summary/{id}`, só para id real.
   - **Visita:** `POST /api/profile-views` `{ targetUserId }`, só para id real. Uma por
     abertura de perfil, silenciosa se falhar.
   - **"Compareci":** `marcarComoRealizada` já chamava `POST /api/meetings/{id}/complete` no
     modo API. A notificação "Avalie a reunião" sai dessa chamada (quem clicou) ou da troca
     de status confirmada para realizada (a outra parte), e o aviso "N reunião para avaliar"
     sai das pendentes vindas do back. Nada disso depende do mock.
3. **Modal de reunião aberto pelo popup do unio** (`SolicitarReuniaoModal`), no modo API:
   - O unio do popup só vem pré-selecionado se for id real e estiver na lista de
     `GET /api/meetings/counterparts` (`preSelecaoDeContraparte`).
   - Se não estiver, o modal abre sem ninguém escolhido e mostra "Este contato é de
     exemplo. Escolha um usuário cadastrado da lista.".
   - A validação exige um id real presente na lista (`contraparteValida`), não só um campo
     preenchido.
4. **Gate de onboarding consulta o back** (`routes/OnboardingGate.tsx`):
   - Se a conta tem perfil e este navegador não tem status gravado, o gate consulta
     `GET /api/profile/onboarding`.
   - `CONCLUIDO` ou `PULADO` ficam gravados no `localStorage` e liberam a entrada.
     `PENDENTE`, status ausente ou falha na consulta mandam para o wizard, como antes.
   - Durante a consulta aparece o "Carregando...", sem piscar o wizard.
   - Concluir e pular agora gravam o status no back com `PUT { status }`, sem `respostas`
     no corpo, o que mantém as respostas salvas (`salvarStatusOnboardingNoBack`). No
     primeiro cadastro, a gravação do status vem depois da gravação das respostas, porque o
     back salva a linha inteira e dois PUT ao mesmo tempo poderiam se sobrescrever.
   - O modo mock continua só com o `localStorage`.
5. **Dashboard da startup honesto** (`dashboardStartup.mapping.ts`, `montarResumoApi`), no
   modo API:
   - **Visualizações (28 dias), variação e série semanal:** vêm de
     `GET /api/profile/me/popularity`.
   - **"Reunião marcada" no funil:** conta as `CONFIRMADA` e `REALIZADA` do
     `GET /api/meetings`.
   - **Contatos iniciados:** são a contagem local do popup do unio (não é mock). Um número
     real nunca é trocado pelo valor do mock, nem quando é 0.
   - **Ainda sem endpoint no back:** interessados, matches, a etapa "Demonstraram
     interesse" do funil e os investidores recomendados continuam com o mock e levam o selo
     discreto "Dados de exemplo" (`components/dashboard/SeloExemplo.tsx`). Se uma chamada
     ao back falhar, aquele bloco volta ao mock com o mesmo selo.
   - O selo só aparece no modo API.
6. **Limpeza:**
   - "Esqueceu a senha?" virou o texto "Recuperação de senha em breve", sem link.
   - `src/pages/EmBreve.tsx`, que ninguém importava, foi removido.
   - `.env.example` não tinha `VITE_USE_MOCKS`, então não mudou (a variável continua só no
     `.env` local, que não é editado por aqui).

## Alternativas

- **Mapear os slugs de mock para usuários reais:** criaria um vínculo falso entre perfis de
  exemplo e pessoas reais. Descartado.
- **Esconder Descobrir e Investidores no modo API:** tiraria as telas principais da demo. Os
  perfis de exemplo ficam, mas nunca chegam ao back.
- **Guardar "já avaliei" só no `localStorage`:** quebraria em outro navegador. O back já
  responde `GET /reviews` por reunião, então a fonte é o back, com cache em memória.
- **Gate sempre consultando o back:** uma chamada a cada navegação. A consulta acontece só
  quando o navegador não tem o status.
- **Esconder do dashboard os cards sem endpoint:** deixaria a tela vazia. O selo "Dados de
  exemplo" mantém o layout e não engana.

## Consequências

- Nenhuma alteração em `unio/`.
- **O que continua exemplo no modo API:**
  - Descobrir, Investidores, perfis de startup e investidor (e a popularidade e as visitas
    desses perfis);
  - compatibilidade;
  - interesse, salvos, Meus unios, contato e desfazer match;
  - interessados, matches, a etapa "Demonstraram interesse" e os investidores recomendados
    do dashboard;
  - notificações (derivadas no front);
  - telas do admin.
- **Testes novos:**
  - `tests/idsBack.test.ts`;
  - `tests/dashboardStartup.mapping.test.ts`;
  - `tests/onboardingStatus.test.ts`;
  - casos novos em `tests/reunioes.mapping.test.ts` (`idDoParticipante`, `contraparteValida`,
    `preSelecaoDeContraparte`) e em `tests/avaliacoes.mapping.test.ts` (`avaliacaoEhMinha`,
    `ehAvaliacaoRepetida`, `realizadasParaConsultar`).
- **Arquivos novos:** `utils/idsBack.ts`, `services/dashboardStartup.mapping.ts`,
  `components/dashboard/SeloExemplo.tsx`.
- **Arquivo removido:** `pages/EmBreve.tsx`.

### Apoio de teste (não executado)

O back só deixa concluir uma reunião depois do horário de início. Para testar o "Compareci"
sem esperar, uma reunião `CONFIRMADA` **de teste** pode ser movida para o passado **no banco
de desenvolvimento**. O comando fica registrado aqui para decisão da equipe; ele **não foi
executado**:

```sql
UPDATE meetings
SET starts_at = now() - interval '2 hours', ends_at = now() - interval '1 hour 30 minutes'
WHERE id = <id>;
```

### Roteiro ponta a ponta (back e Postgres no ar, `VITE_MOCK_BACKEND` indefinido)

1. **Startup pede a reunião.** Entrar como a startup Tidalog e, em Reuniões, solicitar
   reunião a um investidor cadastrado da lista "Com quem".
2. **Investidor aceita.** Numa janela anônima, entrar como esse investidor e aceitar um
   horário.
3. **Passar do horário.** Esperar o horário de início passar ou usar o apoio de teste acima.
4. **Marcar presença.** Clicar "Compareci" nos dois lados (o segundo clique já encontra a
   reunião realizada).
5. **Avaliar.** Avaliar nos dois lados.
6. **Conferir as telas.** Ver a aba Popularidade do investidor e o card da startup.
   - A porcentagem só aparece com 3 avaliações ou mais.
   - Abaixo disso aparece "Ainda sem avaliações suficientes".
7. **Conferir as chamadas no Network:** `/complete`, `/reviews`, `/popularity` e
   `/profile-views`.
   - `/profile-views` só aparece ao abrir um perfil de id real.
   - `/summary` só aparece para id real, e nenhuma tela atual abre perfil de id real.
