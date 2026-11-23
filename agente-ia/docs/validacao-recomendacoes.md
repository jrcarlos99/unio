# Recomendações do agente de IA

## Problema e finalidade

Investidores precisam localizar startups coerentes com sua tese; startups precisam encontrar investidores cujo estágio, ticket, região e estratégia sejam compatíveis. O agente ordena perfis para apoiar a decisão de descoberta. A recomendação não aprova investimento, não cria match e não substitui a decisão das pessoas.

## Abordagem e arquitetura

Foi escolhida uma LLM porque parte do alinhamento é textual e contextual (mercado, problema, necessidades e estratégia), enquanto ainda há poucos dados rotulados para treinar um classificador supervisionado. O scorecard determinístico existente é uma alternativa transparente, mas compara principalmente campos exatos/faixas e não explica alinhamento semântico. Embeddings/RAG não foram escolhidos nesta etapa porque a entrada é composta por perfis estruturados e não há uma coleção documental que precise de recuperação. A limitação da LLM é a subjetividade; por isso a nota final usa critérios fixos, pesos visíveis, evidências por fator e validação humana.

1. O usuário conclui o onboarding e abre Descobrir (investidor) ou Investidores (startup).
2. O backend Java valida a sessão e o onboarding, lê o perfil atual e os perfis ativos do papel complementar e remove o próprio usuário.
3. O backend envia ao serviço Python apenas atributos de perfil e respostas de onboarding relevantes. E-mail e nome não são usados como critérios; consentimento LGPD não é enviado.
4. O serviço Python chama a LLM para avaliar cada critério e devolver nota, justificativa e pontos de atenção em JSON validado.
5. O serviço Python valida IDs e fatores, aplica os pesos publicados, calcula cobertura e total, classifica e ordena os resultados.
6. Java acrescenta o estado de salvo/interesse do usuário e entrega uma única resposta ao frontend.
7. Cards, filtros e perfil usam a mesma resposta do agente. Salvar e demonstrar interesse continuam usando os endpoints próprios do backend.

## Dados e preparação

Os dados vêm dos perfis e do onboarding armazenados no PostgreSQL do sistema. São considerados segmento, mercado-alvo, estágio, capital procurado, ticket, localização/região, modelo de negócio, necessidades, tração, disponibilidade, formas de interação, perfil de risco e preferências declaradas no onboarding.

O backend mantém apenas as chaves de onboarding relevantes para análise. São descartados consentimento, e-mail e outros campos que não representam preferência de investimento. A LLM recebe IDs técnicos para devolver os candidatos avaliados; o nome de exibição e o perfil público são anexados pelo serviço Python depois da resposta e não são usados no prompt como critério.

Campos ausentes ou sem evidência recebem `score: null`. Eles não são tratados como nota zero e não entram no denominador. O total é reescalado pelos pesos dos fatores com evidência; `dataCoverage` informa a soma dos pesos considerados. Sem qualquer evidência, o total é nulo e a classificação é `DADOS_INSUFICIENTES`.

## Pesos e fórmula

| Critério | Peso | Justificativa |
| --- | ---: | --- |
| Segmento e mercado | 30% | É o alinhamento central entre a tese do investidor e o problema/mercado da startup. |
| Estágio e prontidão | 20% | O investidor precisa atuar no estágio em que a startup se encontra. |
| Ticket e capital | 25% | A faixa disponível precisa ser compatível com a necessidade financeira. |
| Região | 15% | Considera foco geográfico e possibilidade de atuação remota. |
| Complementaridade estratégica | 10% | Considera modelo de negócio, necessidades, disponibilidade, risco e formas de apoio descritas. |
| **Total** | **100%** | |

Para os fatores com evidência, `compatibilidade = arredondar(soma(nota × peso) / soma dos pesos disponíveis)`. A nota de cada fator é de 0 a 100. Pesos são pontos percentuais; o total exibido também fica entre 0 e 100.

Exemplo demonstrativo, não resultado de usuário: notas 100, 80, 60, 100 e 70 produzem `30 + 16 + 15 + 15 + 7 = 83%`. Se região não tiver evidência, o resultado é `6.800 / 85 = 80%`, com cobertura de dados de 85%.

Faixas: 85–100 Excelente; 70–84 Forte; 55–69 Moderado; 40–54 Fraco; 0–39 Sem match. Sem evidência, a classificação é Dados insuficientes.

## Implementação e resposta

O agente devolve, por candidato, total, classificação, cobertura, notas/pesos/justificativas por fator, resumo, pontos fortes, pontos de atenção, próximo passo e perfil público necessário para as telas. O agente valida que os IDs pertencem à entrada, remove duplicatas e ordena pela nota calculada. O frontend só apresenta essa saída.

O resultado é guardado em cache em memória por até cinco minutos, com uma chave baseada na entrada completa. Uma mudança de perfil, onboarding ou conjunto de candidatos forma uma chave diferente e gera nova avaliação. O frontend conserva a mesma resposta por 30 segundos durante a navegação card–perfil–volta e invalida o cache local depois de salvar/interessar, para atualizar o estado das ações sem precisar repetir a análise da LLM. Novos candidatos entram na próxima consulta após a expiração do cache local.

## Validação a apresentar

Não registrar números de qualidade antes de executar a avaliação. Para a apresentação, formar um conjunto de pares startup–investidor avaliado por duas pessoas do grupo, com rótulos de alinhamento alto/médio/baixo e justificativas. Para cada perfil, verificar:

- se os cinco fatores e pesos aparecem corretamente;
- se a soma ponderada reproduz o total;
- se perfis mais relevantes aparecem antes dos menos relevantes;
- se justificativas apontam campos reais e não inventam dados;
- se campos ausentes reduzem a cobertura e não são tratados como incompatibilidade;
- se lista e perfil exibem o mesmo total, classificação e justificativas;
- se a volta do perfil reutiliza o resultado e salvar/interesse continuam funcionando.

Relatar tamanho e composição do conjunto, concordância entre avaliadores, erros observados, latência da primeira análise e latência de uma volta com cache. Comparar precisão do top 5 ou nDCG@5 com o ranking de referência, se houver pares rotulados suficientes. Registrar exemplos positivos, negativos e casos sem dados.

## Limitações e próximos passos

O serviço depende de uma API externa e de perfis preenchidos. Notas sem rótulos históricos refletem uma avaliação semântica da LLM, não uma probabilidade estatística de investimento. A fórmula é explicável, mas os pesos são uma hipótese de produto escolhida pelo grupo e devem ser revistos com feedback dos usuários. Cache em memória não é compartilhado entre instâncias do agente e desaparece em reinicializações. Próximas etapas possíveis são uma avaliação com especialistas, observação consentida dos interesses reais e ajuste documentado de pesos a partir dessas evidências.
