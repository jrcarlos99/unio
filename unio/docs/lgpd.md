# Política de privacidade e consentimento

## Finalidade do tratamento

O UNIO trata dados de cadastro, autenticação e perfil para criar e proteger
contas, permitir o matching entre startups e investidores, calcular scores
explicáveis, prestar suporte e manter registros de auditoria e segurança.

## Bases legais

O cadastro e o uso dos termos de uso e da política de privacidade dependem do
consentimento do titular, registrado em `consent_records`. Outros tratamentos
podem estar fundamentados na execução do contrato, no cumprimento de
obrigações legais e no legítimo interesse para prevenção a fraudes, segurança
e melhoria da plataforma, sempre respeitando os direitos do titular.

## Direitos do titular

O titular pode solicitar confirmação e acesso aos dados, correção, informação
sobre o tratamento, portabilidade quando aplicável, revogação do consentimento
e eliminação ou anonimização quando não houver obrigação legal de retenção.
O consentimento pode ser revogado pela API em `POST /api/consent/revoke`.

### Como o titular exerce os direitos pela plataforma (T13)

| Direito | Endpoint |
|---|---|
| Confirmação, acesso e portabilidade | `GET /api/privacy/export` — todos os dados em JSON (anexo) |
| Correção | `PUT /api/profile/me` |
| Revogação do consentimento | `POST /api/consent/revoke` |
| Eliminação | `POST /api/privacy/delete-account` — exige senha; anonimiza a conta (ver D029) |

Na eliminação, dados de perfil, pitch, onboarding e scores são apagados; o
conteúdo das mensagens enviadas e os comentários de avaliações são removidos;
o registro de consentimento e os logs de auditoria são mantidos pelo prazo de
retenção a definir (base: cumprimento de obrigação legal e segurança).

Este documento é um rascunho operacional e deve ser revisado pelo responsável
jurídico e pelo encarregado de dados antes da publicação.
