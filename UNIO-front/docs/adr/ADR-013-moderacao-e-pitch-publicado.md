# ADR-013: Moderação no admin e pitch publicado para o investidor

- **Autora:** Carol
- **Data:** 2026-11-22
- **Status:** Aceita
- **Back:** D063 em `unio/docs/decisoes.md`; contrato em `unio/docs/contrato/contrato-moderacao.md`
- **Auditoria:** [`docs/integracao/auditoria-front-back.md`](../integracao/auditoria-front-back.md)

## Contexto

Pela ADR-011, as telas sem endpoint ficaram com estado vazio honesto:

- **Cadastros** só listava `GET /api/admin/users`, com o aviso "Aprovar e rejeitar
  cadastros ainda não estão disponíveis".
- **Moderação de Conteúdo** mostrava "Ainda não disponível".
- **Pitch e Lean Canvas** da startup salvava nas respostas do onboarding e, ao publicar,
  marcava `PUBLISHED` direto no próprio JSON (`TODO(api)` em `pitchService.ts`), sem
  ninguém revisar e sem o investidor conseguir ler.
- **Perfil da startup** visto pelo investidor escondia o canvas (`canvas: null` no
  mapeamento da descoberta).
- O aviso de moderação prometia "SLA: ~4h úteis", um número que não vinha do back.

O back passou a ter a moderação (D063): rotas de ADMIN para contas e conteúdo, envio do
pitch pela startup e leitura do publicado pelo investidor.

## Decisão

1. **Cadastros (`ModeracaoCadastros`)**: lista de `GET /api/admin/moderation/accounts`
   com filtro por situação e perfil, busca por e-mail ou nome e paginação de 20. Cada
   linha tem os botões que cabem na situação (`acoesDaConta`): Aprovar, Recusar, Suspender,
   Reativar. Toda ação abre `ModalConfirmacao`, que explica o efeito, exige motivo de 3 a
   255 caracteres em recusar e suspender (mesma regra do back) e mostra a mensagem de
   erro do back sem fechar. Estado vazio: "Nenhuma conta aguardando aprovação." no filtro
   de pendentes. O aviso de "ainda não disponível" saiu.
2. **Conteúdo (`ModeracaoConteudo`)**: duas listas do mesmo endpoint, "Aguardando revisão"
   (`status=EM_REVISAO`) e "Histórico de decisões" (`status=PUBLICADO,REMOVIDO`), com o
   pitch curto, o link do vídeo e os nove blocos do canvas. Aprovar e Remover (motivo
   obrigatório) só no envio atual; o envio substituído aparece marcado e sem botões.
3. **Auditoria**: `logDoBack` traduz os códigos novos (`MODERACAO_CONTA_*`,
   `MODERACAO_PITCH_*`) para "Suspendeu a conta 12. Situação anterior...". Os códigos
   antigos continuam no formato de antes.
4. **Pitch e Canvas da startup**: o rascunho continua nas respostas do onboarding (ADR-003).
   O botão passa a salvar e depois chamar `POST /api/profile/startup/pitch/publication`,
   que copia o que foi salvo. O rótulo segue a configuração do back (`requiresApproval`):
   "Enviar para publicação" ou "Publicar". A situação mostrada vem do último envio
   (`GET .../publication`), não do JSON das respostas: Em revisão, Publicado ou Removido
   pela moderação, com o motivo. O aviso sem número de SLA explica o que acontece em cada
   caso, inclusive que uma versão nova substitui a publicada até ser aprovada. O botão
   fica ativo quando há alteração, quando o salvo difere do último envio, depois de uma
   remoção ou se nunca houve envio.
5. **Perfil da startup visto pelo investidor**: `PitchPublicadoSecao` busca
   `GET /api/discovery/startups/{id}/pitch` e mostra o pitch, o link do vídeo e os blocos
   preenchidos do Lean Canvas (com os títulos e ícones de `leanCanvasBlocks.ts`). 404 vira
   "Esta startup ainda não publicou o pitch.", sem erro. Saiu o selo "Dossiê UNIO Audit",
   que não vinha do back.
6. **Login**: o 403 de conta recusada ou suspensa já chegava pelo `message` do back em
   `getApiErrorMessage`; o parágrafo de erro ganhou `role="alert"` para o leitor de tela.
7. **Mapeamento isolado**: `moderacao.mapping.ts` e `pitchPublicacao.mapping.ts` são os
   únicos que conhecem os JSON novos; `moderacaoService.ts` e `pitchPublicacaoService.ts`
   fazem as chamadas. Testes em `tests/moderacao.mapping.test.ts` e
   `tests/moderacao.http.test.ts` (padrão de `tests/helpers/httpSimulado.ts`).

## Alternativas

- **Mandar o pitch no corpo do POST**: o back preferiu ler o que está salvo (D063), então o
  front salva antes e envia sem corpo; assim não há como publicar algo diferente do salvo.
- **Guardar a situação no JSON das respostas, como antes**: deixaria a startup marcar o
  próprio pitch como publicado. A situação agora só vem do back.
- **Manter "SLA: ~4h úteis"**: é um número de exemplo, proibido pela ADR-011.
- **Mostrar o canvas pelo `canvas` de `StartupDescoberta`**: exigiria mudar o
  `PublicProfileDto` do back, que ficou intacto; a seção busca a rota nova.

## Consequências

- Se o back publicado ainda não tiver as rotas novas, `GET .../publication` responde 404 e
  a página abre como rascunho; o envio falha com a mensagem do back.
- A ordem da lista de cadastros só muda na próxima carga: depois de uma ação, a linha
  mostra a situação nova no mesmo lugar.
- Arquivos: `src/pages/admin/pages/ModeracaoCadastros.tsx`, `ModeracaoConteudo.tsx`,
  `src/pages/admin/components/ModalConfirmacao.tsx`, `SeloSituacao.tsx`,
  `src/pages/admin/types.ts`, `src/services/moderacao.mapping.ts`, `moderacaoService.ts`,
  `pitchPublicacao.mapping.ts`, `pitchPublicacaoService.ts`, `pitchService.ts`,
  `admin.mapping.ts`, `adminService.ts` (comentário), `src/hooks/usePitchEditor.ts`,
  `src/pages/startup/PitchCanvas.tsx`, `src/components/pitch/ModerationBanner.tsx`,
  `PitchStatusBadge.tsx`, `PublishPendingAlert.tsx`, `src/types/pitch.ts`,
  `src/components/discovery/PitchPublicadoSecao.tsx`, `PitchCanvasCard.tsx`,
  `src/pages/investidor/PerfilStartup.tsx`, `src/components/auth/LoginForm.tsx`.
