# UNIO

## Plataforma de Matchmaking para Startups e Investidores Anjo do Nordeste

Projeto Integrador do 5º período de Análise e Desenvolvimento de Sistemas (SENAC Recife), desenvolvido no contexto de **Startups e Economia Criativa**, integrando as disciplinas de Full Stack, Empreendedorismo, Governança em TI e Verificação e Validação.

## Sobre o projeto

O produto conecta **startups nascentes do Porto Digital** (Bairro do Recife) a **mentores e investidores anjo**, oferecendo matchmaking por afinidade, comunicação dentro da plataforma e acompanhamento de métricas do ecossistema — do primeiro contato até a formalização de investimento/mentoria.

## Atores

| Ator | Descrição |
|---|---|
| Startup (Empreendedor) | Cadastra a startup, apresenta o modelo de negócio e busca mentoria/investimento |
| Investidor Anjo / Mentor | Cadastra perfil de interesse, avalia startups compatíveis e interage com elas |
| Administrador da Plataforma | Modera cadastros e conteúdo, acompanha métricas do ecossistema |

## Funcionalidades

### Implementadas
- [x] Cadastro de startup com perfil (segmento, estágio, necessidades) — RF01
- [x] Cadastro de investidor/mentor com perfil (área de interesse, ticket médio, disponibilidade) — RF02
- [x] Tela de login/cadastro com painel deslizante
- [x] Painel administrativo: visão geral com métricas do back, lista de cadastros e log de auditoria (aprovar, rejeitar e moderar conteúdo aguardam endpoint no back)

### Planejadas
- [ ] Matchmaking entre startups e investidores/mentores por critérios de afinidade — RF03
- [ ] Visualização de perfis compatíveis antes do contato — RF04
- [ ] Mensagens e agendamento de reuniões dentro da plataforma — RF05
- [ ] Apresentação de pitch/Canvas no perfil da startup — RF06
- [ ] Autenticação real e restrição de funcionalidades por perfil de acesso — RF07
- [ ] Feedback e avaliação pós-interação — RF10
- [ ] Política de uso e termos de consentimento conforme a LGPD — RF11

## Stack técnica

- **Front-end:** React, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React

## Identidade visual

Paleta:

| Nome | Hex | Uso |
|---|---|---|
| Chalky | `#F0D393` | Fundo principal, headers, botões primários |
| Catalina Blue | `#1A3E65` | Elementos secundários, hover, estados ativos |
| White | `#FFFFFF` | Fundo geral da página, seções claras, cards, inputs |

## Requisitos não funcionais em destaque

- **Segurança:** dados pessoais e de negócio criptografados em trânsito e em repouso
- **Conformidade:** tratamento de dados pessoais segundo a LGPD (consentimento, finalidade, direito de exclusão)
- **Usabilidade:** interface intuitiva para públicos não técnicos (empreendedores e investidores)
- **Escalabilidade:** arquitetura preparada para crescimento da base de usuários sem redesenho
- **Confiabilidade:** funcionalidades críticas cobertas por testes e validadas com usuários reais antes do lançamento
- **Portabilidade:** aplicação responsiva, com acesso via desktop e mobile
- **Auditabilidade:** ações administrativas registradas em log de auditoria

## Como rodar o projeto (front-end)

```bash
# Instalar dependências
npm install

# Rodar em ambiente de desenvolvimento
npm run dev

# Gerar build de produção
npm run build
```

### Endereço do back-end

O front fala só com o back, sem dados de exemplo (ADR-011). A URL vem de uma única
variável, `VITE_API_URL`, lida no build:

- **Produção:** defina `VITE_API_URL` na hospedagem do front (ex.: Vercel → Settings →
  Environment Variables) com a URL do App Service, sem barra no final. Sem a variável, o
  build usa o back do Azure como padrão.
- **Desenvolvimento com o back local:** no `.env` (não versionado), use
  `VITE_API_URL=http://localhost:8080`. O modelo está em `.env.example`.

O endereço publicado do front precisa estar em `UNIO_CORS_ALLOWED_ORIGINS` no back
(D056), senão o navegador bloqueia as chamadas por CORS.

## Estrutura de pastas

```
src/
├── components/     # Componentes reutilizáveis (Input, Select, Button, DataTable, MetricCard...)
├── pages/          # Páginas/rotas (Login, CadastroStartup, CadastroInvestidor, Admin...)
├── layouts/         # Layouts compartilhados (AdminLayout)
└── ...
```
