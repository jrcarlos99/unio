# ADR-008: Descoberta, interesse, match e salvos em dois modos, com mapeamento isolado

- **Autora:** Carol
- **Data:** 2026-11-16
- **Status:** Aceita
- **Atualiza:** ADR-007 (o que era exemplo no modo API passa a vir do back)
- **Back:** D045 a D053 e D055 em `unio/docs/decisoes.md`, migrations `V26` e `V27`,
  contrato em `unio/docs/contrato/contrato-descoberta.md`

## Contexto

No modo API, as telas do matching (Descobrir, Investidores, perfis de candidato, Salvos e
Meus unios) usavam perfis de exemplo com ids em texto. A compatibilidade era calculada no
front, e interesse, salvos e match ficavam no `localStorage`. O back agora tem:

- `/api/discovery`, com score calculado pelo scorecard;
- `/api/interests`, com match mútuo derivado;
- `/api/saved`;
- o e-mail do outro lado, mas só depois do match.

O modo mock (`VITE_MOCK_BACKEND=true`) precisa continuar exatamente igual.

## Decisão

1. **Serviços em dois modos, no padrão de reuniões (ADR-005).**
   - `discoveryService.ts` e `investidoresService.ts` só escolhem a implementação por
     `MOCK_BACKEND`. As telas continuam importando apenas esses arquivos.
   - `.mock.ts`: o código antigo, sem mudança de comportamento.
   - `.api.ts`: as chamadas ao back, com as mesmas funções e os mesmos tipos.
   - Peças comuns do modo API ficam em `services/descobertaApi.ts`: paginação de até 3
     páginas de 100, detalhe com 404 virando "não encontrado", feedback e selo de
     popularidade.
2. **Mapeamento isolado.** `services/discovery.mapping.ts` é o único arquivo que conhece o
   JSON do back. São funções puras, testadas em `tests/discovery.mapping.test.ts`.
3. **Compatibilidade do scorecard.**
   - O total é o `scoreFinal`, arredondado e limitado a 0 a 100.
   - As notas vêm de `dimensions`:

     | Dimensão do back | Critério na tela |
     | --- | --- |
     | `SEGMENTO` | Segmento |
     | `ESTAGIO` | Estágio |
     | `CAPITAL` | Ticket e capital |
     | `REGIAO` | Região |

   - Disponibilidade não existe no scorecard, então a barra dela não aparece no modo API.
   - O card mostra também a classificação e o próximo passo do back.
   - "Por que você viu" usa os `topPositiveFactors` (nota de 70 ou mais), com texto por papel.
   - `calcularCompatibilidade` continua só no mock.
4. **Nada inventado.**
   - Ficam `null` ou vazios no modo API, e a tela esconde: fundação, equipe, canvas, rodada,
     métrica de destaque, portfólio, "investe desde", tempo de resposta, bio, "o que busca"
     e "como apoia".
   - Para tratar isso, os tipos ganharam campos que aceitam `null`.
   - Os mocks usam `StartupDescobertaCompleta` e `InvestidorDescobertaCompleto`, com tudo
     preenchido.
   - A descrição da startup é o `pitchCanvas` do cadastro. A frase de tese do investidor é
     montada só com os segmentos e estágios dele.
   - O investidor não tem cidade no back; no lugar aparece a região de interesse.
5. **Interesse, match e salvos.**
   - "Tenho interesse" chama `PUT /api/interests/{id}`, e o back responde se ficou enviado
     ou se virou match (o toast de match já existia).
   - `RECEIVED` (o outro lado demonstrou interesse) aparece como "nenhum": o botão continua
     disponível e o clique vira match na hora.
   - Salvos usam `/api/saved`; Meus unios, `/api/interests/matches`.
   - "Desfazer match" chama `DELETE`, e o toast diz quantas reuniões o back cancelou
     (`reunioesCanceladas`). No mock, o cancelamento continua no `reunioesService`.
6. **Feedback do algoritmo, silencioso.**
   - O item da API traz o par `scorecard`.
   - Feedbacks enviados:
     - `VIEWED` ao abrir o perfil de um candidato;
     - `INTERESTED` ao clicar em "Tenho interesse".
   - As telas não têm a ação de dispensar, então `NOT_INTERESTED` não é enviado.
   - Erro de feedback nunca bloqueia a tela nem mostra toast. O 409 `FEEDBACK_DUPLICATE`
     conta como sucesso.
7. **Listas e filtros.**
   - A lista vem ordenada por score do back e é aplicada a mesma regra de popularidade do
     mock (ADR-006): só desempata e dá um bônus pequeno.
   - O selo de popularidade usa `GET /api/reviews/summary/{id}`, com cache da sessão e
     limite de 60 por lista.
   - O serviço aceita filtros e os envia como parâmetros (`q`, `segmento`, `estagio`,
     `tipo`). As telas carregam a lista e filtram no cliente, como antes: os chips são
     montados a partir da lista, e uma requisição por tecla deixaria a busca lenta.
   - O número "N combinam" é o tamanho da lista do back.
   - O estado vazio diz "Ainda não há startups cadastradas" ou "Ainda não há investidores
     cadastrados".
   - O card de tesouraria (Descobrir) e o de captação (Investidores) não aparecem no modo
     API: o back não tem esses dados.
8. **Visitas.** Com ids reais nas listas, `POST /api/profile-views` passa a ser chamado ao
   abrir um perfil. O código já estava pronto desde a ADR-007.

## Alternativas

- **Trocar as telas para chamar o back direto.** Espalharia o JSON do back por várias
  telas. Descartado.
- **Filtrar no back a cada tecla.** Uma chamada por tecla e chips que sumiriam com o
  filtro. A filtragem fica no cliente, sobre até 300 itens.
- **`.mock` e `.api` também para `recomendacoesService` e `unioLocal`:**
  - `recomendacoesService` é uma fachada que só repassa e nunca chama o back.
  - No `unioLocal`, a parte que muda de modo já está dentro dos serviços. Os eventos de
    contato continuam locais nos dois modos, porque não há endpoint para eles.
  - Separar esses dois arquivos duplicaria código sem mudar comportamento.

## Consequências

- **Continua exemplo, só no modo mock:** compatibilidade calculada no front, canvas e
  rodada da startup, portfólio, bio e tempo de resposta do investidor, tesouraria e
  contatos de exemplo.
- **Fica local nos dois modos:** a contagem de "Contatos iniciados" (eventos do popup do
  unio) e a tese exibida no topo do Descobrir, que vem das respostas do onboarding.
- **Arquivos novos:**
  - `services/discovery.mapping.ts`
  - `services/descobertaApi.ts`
  - `services/discoveryService.api.ts`, `services/investidoresService.api.ts`
  - `utils/perfilDescoberta.ts`
  - `tests/discovery.mapping.test.ts`
- **Arquivos renomeados:** `services/discoveryService.ts` e `services/investidoresService.ts`
  viraram `.mock.ts`. Os nomes antigos agora são os seletores de modo.
- **Pendências para o squad:**
  - Pitch e canvas na descoberta (D046).
  - Telefone e WhatsApp no perfil (ADR-009).
  - Ação de dispensar, que enviaria `NOT_INTERESTED`.
  - Sinal visual para "demonstrou interesse em você" (`RECEIVED`).
