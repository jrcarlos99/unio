# ADR-001: Onboarding como único caminho de criação de perfil

- **Status:** Aceita
- **Data:** 2026-11-07
- **Back:** D028, D029 e D030 em `unio/docs/decisoes.md`

## Contexto

Depois do registro (`POST /api/auth/register`, que cria só o usuário) havia dois caminhos:

- o formulário antigo (`pages/CadastroStartup.tsx` e `pages/CadastroInvestidor.tsx`), que criava o
  perfil com `POST /api/profile/startup` e `POST /api/profile/investor`;
- o onboarding novo (`pages/onboarding/*`, 4 passos), que só guardava respostas no `localStorage`.

Quem se registrava caía no formulário antigo. O onboarding não criava perfil, então as respostas
mais completas nunca chegavam ao scorecard. Enquanto não existe perfil, `GET /api/profile/me`
responde 404 e o `AuthContext` marca `user.perfilCompleto = false`.

## Decisão

1. **O onboarding passa a criar o perfil.** No último passo, quem não tem perfil vê o botão
   "Concluir e criar meu perfil", desabilitado até marcar o consentimento LGPD. Ao clicar:
   valida, monta o corpo (ADR-002) e chama o `POST` com o cliente `api`.
   - Sucesso: `refreshProfile()`, grava as respostas em `/api/profile/onboarding` (ADR-003, sem
     bloquear), marca o onboarding como concluído e navega para `/home-startup` ou
     `/home-investidor` com `state.cadastroSucesso` (mensagem de boas-vindas que já existia).
   - 409 (perfil já existe) conta como sucesso.
   - 400: faixa de erro acima do botão com a mensagem do back; respostas mantidas.
   - Sem resposta (rede, tempo esgotado) ou erro 5xx: mesma faixa com "Tentar novamente".
   - Envio duplo bloqueado por uma trava síncrona (`useRef`) além do estado `ocupado`.
2. **O onboarding é obrigatório para quem não tem perfil.** O "Pular por enquanto" some de todos
   os passos e o cabeçalho mostra "Falta pouco para criar o seu perfil". "Voltar" continua.
3. **Quem já tem perfil segue como antes:** o botão final só conclui o onboarding (sem `POST`) e o
   "Pular por enquanto" continua.
4. **Gates:** `CadastroGate` manda quem tem `perfilCompleto === false` para `/onboarding/<perfil>`
   (prop renomeada de `rotaCadastro` para `rotaOnboarding`). O `OnboardingGate` usa
   `statusEfetivo`: conta sem perfil é sempre "pendente", mesmo que o `localStorage` diga
   "concluido" ou "pulado" (contas de teste antigas). Nada é apagado; o wizard retoma as respostas.
5. **Pós-registro:** `Login.tsx` navega para `/onboarding/startup` ou `/onboarding/investidor`.
6. **Formulário antigo removido.** `/cadastro-startup` e `/cadastro-investidor` viram
   `Navigate replace` para o onboarding do perfil.
7. **Tela `EscolhaCadastro` (`/cadastro`) removida.** Ela só levava aos formulários antigos e o tipo
   de conta já é escolhido no registro. `/cadastro` vira `Navigate replace` para
   `/login?modo=cadastro`, que abre o `AuthCard` direto no formulário de criar conta. O botão
   "Comece Agora" da landing aponta para esse endereço.
8. O estado do wizard continua salvo por e-mail no `localStorage` (`onboardingService.ts`).

## Alternativas

- **Manter o formulário antigo e o onboarding.** Dois caminhos, dados divergentes.
- **Criar o perfil logo no registro, com dados mínimos.** Exigiria valores falsos (o back pede
  nome, segmento, estágio etc.) e mudança no `AuthService`, fora do escopo.
- **Manter `/cadastro` apontando para o registro com dois botões.** Duplicaria a escolha de tipo
  de conta que já está no `SignupForm`.
- **Registrar o consentimento do onboarding no `ConsentController`.** Ver Consequências.

## Consequências

- Uma única porta de entrada para o perfil; o scorecard recebe os dados do onboarding.
- O botão final passa a depender da rede para quem não tem perfil; os erros ficam visíveis e as
  respostas nunca se perdem (seguem no `localStorage`).
- Se o `refreshProfile()` falhar depois do `POST`, a tela pede para tentar de novo; a segunda
  tentativa recebe 409 e segue como sucesso.
- **Consentimento (proposta, não ligada):** o `ConsentController` do back só tem `GET /me` e
  `POST /revoke`, e o registro nasce no `register` (`acceptedTerms`). O aceite do onboarding
  ("usar as respostas para gerar recomendações e compartilhar contato com quem der match") é uma
  finalidade diferente. Proposta para o squad do back: `POST /api/consent/onboarding` ou um campo
  `finalidade` em `consent_record`, chamado neste mesmo passo. Hoje o aceite fica só em
  `respostas.onboarding.consentimentoLgpd`.
- O editor de perfil da startup deixou de exigir capital (consequência da D029; ver ADR-002).

### Arquivos

- Criados: `src/services/perfilOnboardingService.ts`, `docs/adr/*`.
- Alterados: `src/hooks/useOnboarding.ts`, `src/components/onboarding/OnboardingLayout.tsx`,
  `src/pages/onboarding/OnboardingStartup.tsx`, `src/pages/onboarding/OnboardingInvestidor.tsx`,
  `src/routes/CadastroGate.tsx`, `src/routes/GatePorPerfil.tsx`, `src/routes/OnboardingGate.tsx`,
  `src/routes/publicRoutes.tsx`, `src/services/onboardingService.ts`, `src/pages/Login.tsx`,
  `src/components/auth/AuthCard.tsx`, `src/components/auth/SignupForm.tsx` (comentário),
  `src/components/landing/Hero.tsx`, `src/services/mockBackend.ts`,
  `src/services/onboarding.mapping.ts`, `src/data/options.ts`, `src/components/pitch/styles.ts`
  (comentário).
- Removidos: `src/pages/CadastroStartup.tsx`, `src/pages/CadastroInvestidor.tsx`,
  `src/pages/EscolhaCadastro.tsx` e os componentes usados só por eles:
  `src/components/ui/Header.tsx`, `PageContainer.tsx`, `Input.tsx`, `Select.tsx`, `Textarea.tsx`,
  `CheckboxGroup.tsx`; a constante `DISPONIBILIDADES` de `src/data/options.ts`.
