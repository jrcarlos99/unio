# UNIO — Backend

<p align="center">
  <img src="https://img.shields.io/badge/Java-21-orange" alt="Java 21" />
  <img src="https://img.shields.io/badge/Spring%20Boot-4.1.1-brightgreen" alt="Spring Boot 4.1.1" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-316192" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/JWT-Enabled-000000" alt="JWT" />
</p>

Backend da plataforma UNIO, que conecta startups e investidores anjo por meio de um scorecard de matching configurável, versionável e explicável. O projeto é desenvolvido como Projeto Integrador do 5º período de Análise e Desenvolvimento de Sistemas do SENAC Recife.

## Visão geral

O backend oferece autenticação, perfis de startup e investidor, cálculo persistido de scores, recomendações ordenadas, explicações dos fatores do matching e registro de feedback. A API é stateless, protegida por JWT e organizada por feature.

## Funcionalidades implementadas

- Cadastro e login com Spring Security, JWT e BCrypt
- Perfis de usuário `STARTUP`, `INVESTOR` e `ADMIN`
- Criação, consulta e atualização de perfis de startup e investidor
- Scorecard com critérios, dimensões, pesos e níveis de criticidade
- Políticas de score versionadas e critérios administráveis
- Cálculo e persistência de scores de matching
- Explicação por dimensões, fatores positivos, fatores de atenção e próximo passo
- Recomendações de startups ordenadas por score
- Feedback com deduplicação em janela de cinco minutos
- Mensagens entre startup e investidor, com não lidas e paginação (RF05)
- Agendamento de reuniões com convite, aceite, cancelamento e conflito de agenda (RF05)
- Avaliação pós-reunião com nota de 1 a 5 e média recebida (RF10)
- Consentimento LGPD, exportação dos dados e exclusão da conta por anonimização (RF11/RNF03)
- Métricas do ecossistema para o administrador, incluindo comunicação e avaliações (RF09)
- Log de auditoria (RNF10)
- Erros em formato único (`message` + `errors[]`) e `@PreAuthorize` aplicado em todos os controllers
- Migrations de banco com Flyway
- Documentação OpenAPI/Swagger
- Health check com Spring Actuator
- CORS para desenvolvimento local e frontend publicado

## Stack tecnológica

- Java 21
- Spring Boot 4.1.1
- Maven
- Spring Data JPA
- Spring Security
- PostgreSQL
- Flyway
- JJWT 0.12.6
- Springdoc OpenAPI 2.8.5
- Spring Actuator
- Lombok
- Testcontainers para testes com PostgreSQL

## Arquitetura

O código segue a convenção `package by feature`:

```text
src/main/java/br/com/unio/matchmaking_backend/
├── admin/            # métricas do ecossistema
├── audit/            # log de auditoria (@Auditable)
├── auth/
├── communication/    # mensagens e reuniões (RF05)
├── config/           # segurança, CORS, OpenAPI, tratamento de erros
├── consent/          # consentimento LGPD
├── onboarding/
├── privacy/          # exportação e exclusão de dados (LGPD)
├── profile/
├── review/           # avaliação pós-interação (RF10)
├── scorecard/
│   ├── calculation/
│   ├── common/
│   ├── explanation/
│   ├── feedback/
│   ├── policy/
│   └── recommendation/
└── MatchmakingBackendApplication.java
```

## Requisitos

- Java 21
- Maven Wrapper, incluído no projeto
- PostgreSQL 15 ou superior
- Docker opcional para executar o PostgreSQL

## Configuração

O perfil padrão é `dev` e usa PostgreSQL. Ajuste `src/main/resources/application-dev.properties` conforme o ambiente local:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/matchmaking_dev
spring.datasource.username=matchmaking
spring.datasource.password=<sua-senha>
```

Exemplo de criação do banco:

```sql
CREATE USER matchmaking WITH PASSWORD '<sua-senha>';
CREATE DATABASE matchmaking_dev OWNER matchmaking;
```

As migrations Flyway são executadas automaticamente na inicialização. Em produção, o perfil `prod` utiliza as variáveis abaixo. Não versione credenciais reais.

| Variável | Uso |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | conexão com o PostgreSQL |
| `JWT_SECRET` | chave de assinatura do JWT (mínimo 32 caracteres). Sem ela a API usa a chave de dev e avisa no log |
| `OPENAPI_SERVER_URL` | opcional — URL pública mostrada no Swagger |

## Execução local

Na raiz deste repositório:

```bash
./mvnw spring-boot:run
```

Serviços disponíveis:

- API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui/index.html
- OpenAPI: http://localhost:8080/v3/api-docs
- Health check: http://localhost:8080/actuator/health

Para executar os testes:

```bash
./mvnw test
```

Os testes unitários usam Mockito. Os testes de integração (`@SpringBootTest` +
MockMvc, pacote `integration/`) sobem o contexto completo contra o PostgreSQL do
perfil `dev` e revertem cada teste ao final — o banco local precisa estar no ar.

Teste de carga (k6) e alertas do Azure: veja
[docs/testes/teste-de-carga.md](docs/testes/teste-de-carga.md) e
[docs/operacao/alertas-azure.md](docs/operacao/alertas-azure.md).

## Endpoints principais

### Autenticação

- `POST /api/auth/register`
- `POST /api/auth/login`

O cadastro cria o usuário. Depois do login, o perfil completo deve ser criado no endpoint correspondente à role.

### Perfis

- `GET /api/profile/me`
- `PUT /api/profile/me`
- `POST /api/profile/startup` — role `STARTUP`
- `POST /api/profile/investor` — role `INVESTOR`

### Scorecard

- `POST /api/scorecard/calculate`
- `GET /api/scorecard/{startupId}/explanation?investorId={investorId}`
- `GET /api/scorecard/recommendations?investorId={investorId}&limit=20`
- `POST /api/scorecard/feedback`

O cálculo retorna `201 Created` na primeira persistência e `200 OK` quando o par é recalculado. O contrato usa UUIDs compatíveis com os IDs numéricos dos perfis legados.

### Mensagens (RF05)

- `POST /api/conversations` — abre ou recupera a conversa com `participantId`
- `GET /api/conversations`
- `GET /api/conversations/{id}/messages?page=0&size=30`
- `POST /api/conversations/{id}/messages`
- `POST /api/conversations/{id}/read`

### Reuniões (RF05)

- `POST /api/meetings`
- `GET /api/meetings?status={status}`
- `GET /api/meetings/{id}`
- `POST /api/meetings/{id}/accept` · `/decline` · `/cancel` · `/complete`

### Avaliações (RF10)

- `POST /api/meetings/{id}/reviews`
- `GET /api/meetings/{id}/reviews`
- `GET /api/reviews/received`

Mensagens, reuniões e avaliações são exclusivas de `STARTUP` e `INVESTOR`. Contrato detalhado em [docs/contrato/contrato-comunicacao.md](docs/contrato/contrato-comunicacao.md).

### Privacidade (LGPD)

- `GET /api/consent/me` · `POST /api/consent/revoke`
- `GET /api/privacy/export` — todos os dados do titular em JSON
- `POST /api/privacy/delete-account` — exclusão (anonimização) com senha

### Administração

- `GET /api/admin/users`
- `GET /api/admin/metrics`
- `GET /api/admin/audit`
- `POST /api/admin/bootstrap-admin`
- `POST /api/admin/policies`
- `GET /api/admin/policies/current?investorProfileType={tipo}`
- `POST /api/admin/policies/{policyId}/criteria`
- `GET /api/admin/policies/{policyId}/criteria`
- `PUT /api/admin/criteria/{criterionId}`
- `DELETE /api/admin/criteria/{criterionId}`

Todos os endpoints `/api/admin/**` exigem a role `ADMIN`.

## Autenticação

Use o JWT retornado no login no header das requisições protegidas:

```text
Authorization: Bearer <token>
```

Os endpoints públicos incluem `/api/auth/**`, `/swagger-ui/**`, `/v3/api-docs/**` e `/actuator/**`. As demais rotas exigem autenticação, com restrições adicionais por role quando aplicável.

- Sem token, token expirado ou inválido → `401`
- Autenticado sem permissão → `403`

No Swagger UI, faça login em `POST /api/auth/login`, copie o `token` e use o botão **Authorize**.

### Formato de erro

```json
{
  "timestamp": "2026-11-02T15:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "A mensagem não pode ser vazia",
  "path": "/api/conversations/3/messages",
  "errors": [{ "field": "content", "defaultMessage": "A mensagem não pode ser vazia" }]
}
```

## Integração com o frontend

O frontend React está no repositório [`jrcarlos99/UNIO_frontend`](https://github.com/jrcarlos99/UNIO_frontend). Em desenvolvimento, ele usa `http://localhost:8080` como API padrão; em produção, configure `VITE_API_URL` com a URL publicada do backend.

Origens locais autorizadas pelo CORS:

- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`

O frontend publicado `https://unio-frontend-drab.vercel.app` também está autorizado.

## Documentação do projeto

- [Decisões de arquitetura](docs/decisoes.md)
- [Estado atual e progresso](docs/estado-atual.md)
- [Domínio](docs/dominio.md)
- [Contrato ativo da API v2](docs/contrato/contrato-v2.md)
- [Contrato de comunicação, avaliação e LGPD](docs/contrato/contrato-comunicacao.md)
- [Política de privacidade e LGPD](docs/lgpd.md)
- [Alertas no Azure](docs/operacao/alertas-azure.md)
- [Teste de carga](docs/testes/teste-de-carga.md)
- [Plano de implementação](docs/implementacao/plano-tarefas.md)
- [Entidades](docs/arquitetura/entidades.md)
- [Serviços](docs/arquitetura/servicos.md)

## Status

Backend funcional localmente com PostgreSQL, migrations Flyway, scorecard explicável e integração com o frontend web.

## Licença

Este projeto foi desenvolvido com fins acadêmicos e de demonstração.
