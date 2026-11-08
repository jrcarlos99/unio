# UNIO — Plataforma de Matchmaking para Startups e Investidores Anjo

<p align="center">
  <img src="https://img.shields.io/badge/React-TypeScript-61DAFB" alt="React + TypeScript" />
  <img src="https://img.shields.io/badge/Java-21-orange" alt="Java 21" />
  <img src="https://img.shields.io/badge/Spring%20Boot-4.1.1-brightgreen" alt="Spring Boot 4.1.1" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-316192" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/JWT-Enabled-000000" alt="JWT" />
</p>

Projeto Integrador do 5º período de Análise e Desenvolvimento de Sistemas (SENAC Recife), no contexto de **Startups e Economia Criativa**. A plataforma conecta **startups nascentes do Porto Digital** (Bairro do Recife) a **investidores anjo e mentores**, por meio de matchmaking por afinidade, comunicação dentro da plataforma e acompanhamento de métricas do ecossistema.

Este repositório é um **monorepo**: contém o front-end e o back-end do projeto, cada um em sua própria pasta.

## Estrutura do repositório

```text
UNIO/
├── unio/             # Back-end — Java 21 + Spring Boot
└── UNIO-front/        # Front-end — React + TypeScript + Vite
```

Cada pasta tem suas próprias dependências e seu próprio ciclo de build — não há dependência direta de uma na outra além da comunicação via API HTTP.

## Atores

| Ator | Descrição |
|---|---|
| Startup (Empreendedor) | Cadastra a startup, apresenta o modelo de negócio e busca mentoria/investimento |
| Investidor Anjo / Mentor | Cadastra perfil de interesse, avalia startups compatíveis e interage com elas |
| Administrador da Plataforma | Modera cadastros e conteúdo, acompanha métricas do ecossistema |

## Back-end (`unio/`)

- **Stack:** Java 21, Spring Boot 4.1.1, Spring Security + JWT, Spring Data JPA, PostgreSQL, Flyway, Springdoc OpenAPI (Swagger), Lombok
- **Arquitetura:** `package by feature` (cada domínio — `auth`, `profile`, `scorecard`, `communication`, `review`, `privacy`… — com seu próprio `controller`, `dto`, `entity`, `repository`, `service`)

### Como rodar

```bash
cd unio
./mvnw spring-boot:run
```

- API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui/index.html`

Configure um banco PostgreSQL local (`matchmaking_backend`) e as credenciais em `unio/src/main/resources/application.properties` — veja detalhes no README dentro da pasta `unio/`.

### Principais endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` | Cadastro (startup ou investidor) |
| POST | `/api/auth/login` | Login, retorna token JWT (válido por 1 hora) |
| POST | `/api/auth/forgot-password` | Solicita a recuperação de senha (`{ "email": "..." }`) |
| POST | `/api/auth/reset-password` | Redefine a senha (`{ "token": "...", "newPassword": "..." }`) |
| GET / PUT | `/api/profile/me` | Perfil do usuário logado |
| POST | `/api/profile/startup` | Cria perfil de startup (RF01) |
| POST | `/api/profile/investor` | Cria perfil de investidor (RF02) |
| GET | `/api/admin/users` | Lista usuários (somente ADMIN) |
| POST/GET | `/api/scorecard/**` | Cálculo, recomendações e feedback do matchmaking |
| POST/GET | `/api/conversations/**` | Mensagens entre startup e investidor (RF05) |
| POST/GET | `/api/meetings/**` | Agendamento de reuniões e avaliação pós-reunião (RF05/RF10) |
| GET | `/api/reviews/received` | Avaliações recebidas e média (RF10) |
| GET | `/api/privacy/export` | Exporta todos os dados do titular (LGPD) |
| POST | `/api/privacy/delete-account` | Exclui (anonimiza) a conta do titular (LGPD) |
| GET | `/api/admin/metrics` | Métricas do ecossistema, inclusive comunicação (somente ADMIN) |

Endpoints de `/api/admin/**` exigem role `ADMIN`. Autenticação é via JWT (stateless): sem token ou token expirado a API responde `401`. A documentação completa e interativa está no Swagger UI.

Testes: `cd unio && ./mvnw test` (os de integração precisam do PostgreSQL local). Teste de carga em `unio/load-test/` e alertas do Azure em `unio/infra/azure/` — veja os documentos em `unio/docs/testes/` e `unio/docs/operacao/`.

## Front-end (`UNIO-front/`)

- **Stack:** React, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide React, Axios

### Como rodar

```bash
cd UNIO-front
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173` por padrão.

### Funcionalidades implementadas

- Landing page institucional
- Login / cadastro com painel deslizante
- Cadastro de startup (RF01) e de investidor (RF02)
- Painel administrativo: visão geral com métricas, moderação de cadastros, moderação de conteúdo, log de auditoria
- Integração com a API do back-end (autenticação JWT, perfis)

## Identidade visual

Paleta de cores "Deep Forest":

| Nome | Hex | Uso |
|---|---|---|
| Everest | `#18442A` | Fundo principal, headers, botões primários |
| Olive | `#45644A` | Elementos secundários, hover, estados ativos |
| Sand | `#E4DBC4` | Fundo de seções claras, cards, inputs |
| Off White | `#F3EDE3` | Fundo geral da página |

## Requisitos não funcionais em destaque

- **Segurança:** autenticação JWT, senhas criptografadas, CORS restrito às origens do front
- **Conformidade:** tratamento de dados pessoais segundo a LGPD
- **Usabilidade:** interface intuitiva para públicos não técnicos
- **Auditabilidade:** ações administrativas registradas em log de auditoria

## Roadmap

- [x] Cadastro e login com JWT
- [x] Perfis de Startup e Investidor
- [x] Painel administrativo (moderação e métricas)
- [ ] Matchmaking por critérios de afinidade (RF03)
- [ ] Mensagens e agendamento de reuniões (RF05)
- [ ] Avaliação pós-interação (RF10)
- [ ] Termo de consentimento LGPD (RF11)

## Equipe

| Integrante | Frente |
|---|---|
| Ana Carolina | Front-end |
| Ana Beatriz | Front-end |
| João Carlos | Back-end |
| Robson Barreto | Back-end |
| Muriel Bezerra | Dados / IA |
| Jhonata Teles | QA / Documentação |
| Gabriel Santos | Gestão / Documentação |

## Status do projeto

🚧 Em desenvolvimento — projeto acadêmico em fase de construção do MVP, com front-end e back-end integrados neste repositório.
