# Matchmaking Backend

<p align="center">
  <img src="https://img.shields.io/badge/Java-21-orange" alt="Java 21" />
  <img src="https://img.shields.io/badge/Spring%20Boot-4.1.1-brightgreen" alt="Spring Boot 4.1.1" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-316192" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/JWT-Enabled-000000" alt="JWT" />
</p>

Backend de uma plataforma de matchmaking entre startups e investidores anjo, desenvolvida como projeto acadêmico no Recife / Porto Digital.

## Visão geral

O sistema tem como objetivo conectar startups com investidores com base em critérios de afinidade, consentimento LGPD, avaliação pós-reunião e fluxos de comunicação. A base desta aplicação já contempla autenticação, perfis de usuário e endpoints essenciais para cadastro e login com JWT.

## Funcionalidades implementadas

- Autenticação com Spring Security + JWT
- Cadastro de usuários com perfis de Startup e Investor
- Base de entidades JPA com package by feature
- Persistência com PostgreSQL
- Documentação automática da API com Swagger / OpenAPI
- Estrutura preparada para evolução em matching, consentimento, comunicação e governança

## Stack tecnológica

- Java 21
- Spring Boot 4.1.1
- Maven
- PostgreSQL
- Spring Data JPA
- Spring Security
- JJWT 0.12.6
- Flyway
- Springdoc OpenAPI 2.8.5
- Lombok

## Arquitetura

A estrutura segue a convenção de package by feature:

```text
src/main/java/br/com/unio/matchmaking_backend/
├── auth/
│   ├── controller/
│   ├── dto/
│   ├── entity/
│   ├── repository/
│   └── service/
├── config/
├── profile/
│   ├── controller/
│   ├── entity/
│   ├── repository/
│   └── service/
├── MatchmakingBackendApplication.java
└── ...
```

## Requisitos

- Java 21
- Maven Wrapper (incluído no projeto)
- PostgreSQL 15+ instalado localmente

## Configuração do PostgreSQL

Crie um banco local chamado `matchmaking_backend` e configure as credenciais no arquivo `src/main/resources/application.properties`:

```properties
spring.application.name=matchmaking-backend

spring.datasource.url=jdbc:postgresql://localhost:5432/matchmaking_backend
spring.datasource.username=postgres
spring.datasource.password=postgres
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=false

app.jwt.secret=matchmaking-dev-secret-key-very-long-1234567890
```

Se necessário, execute os comandos abaixo no PostgreSQL:

```sql
CREATE DATABASE matchmaking_backend;
CREATE USER postgres WITH PASSWORD 'postgres';
ALTER USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE matchmaking_backend TO postgres;
```

## Execução local

Na raiz do projeto, execute:

```bash
./mvnw spring-boot:run
```

A aplicação estará disponível em:

- API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui/index.html

## Endpoints principais

### Autenticação

- `POST /api/auth/register`
- `POST /api/auth/login`

### Matching

- `GET /api/matching/criteria-weights`
- `PUT /api/matching/criteria-weights` (apenas ADMIN)
- `GET /api/matching/recommendations`
- `POST /api/matching/swipe`
- `GET /api/matching/mutual`

### Registro de startup

```json
{
  "email": "startup@teste.com",
  "password": "12345678",
  "role": "STARTUP",
  "segmento": "Fintech",
  "estagio": "SEED",
  "localizacao": "Recife",
  "modeloNegocio": "B2B",
  "mercadoAlvo": "PMEs",
  "capitalProcurado": 500000.00,
  "pitchCanvas": "Descrição da startup"
}
```

### Login

```json
{
  "email": "startup@teste.com",
  "password": "12345678"
}
```

## Segurança

A API usa autenticação JWT para proteger os endpoints. Os endpoints públicos incluem:

- `/api/auth/**`
- `/swagger-ui/**`
- `/v3/api-docs/**`

Endpoints administrativos exigem role `ADMIN`.

## Roadmap

- Cadastro e login com JWT
- Perfis de Startup e Investor
- Matching com score ponderado
- Swipe e match mútuo
- Consentimento LGPD
- Mensagens e reuniões
- Avaliação pós-reunião
- Logs de IA e export de dataset

## Observações

- O projeto segue a convenção `package by feature` para organizar domínio, segurança e integrações.
- A implementação atual é a base funcional do backend, com foco em demonstrar viabilidade técnica e arquitetura para apresentação acadêmica.
- O código foi estruturado para permitir evolução em módulos sem acoplamento excessivo.

## Licença

Este projeto foi desenvolvido com fins acadêmicos e de demonstração.

## Status

Backend em funcionamento localmente com PostgreSQL e documentação Swagger ativa para testes de endpoints.
