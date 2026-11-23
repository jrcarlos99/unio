# ADR-014: Admin com o mesmo layout e os mesmos componentes do app

- **Autora:** Carol
- **Data:** 2026-11-22
- **Status:** Aceita
- **Relacionadas:** ADR-010 (admin no modo API), ADR-011 (sem mocks), ADR-013 (moderação)

## Contexto

O painel do administrador (`src/pages/admin`) tinha identidade visual própria,
diferente das telas de startup e de investidor:

| Ponto | Admin antes | Resto do app |
|-------|-------------|--------------|
| Layout | `AdminLayout`: fundo branco, sidebar e conteúdo como painéis flutuantes com margem, breakpoint `md` | `AppLayout`: fundo `lightgray/20`, sidebar fixa de 260px, conteúdo até 1600px, breakpoint `lg`, link "Pular para o conteúdo", `ToastProvider` |
| Sidebar | `AdminSidebar`: rótulo "Navegação", ativo em `sage` com texto escuro, rodapé com e-mail em cartão `sage` e botão Sair solto | `AppSidebar`: ativo em `white/15`, rodapé com iniciais, nome, cargo e menu com Sair, foco visível em fundo escuro |
| Cabeçalho da página | `AdminPageHeader`: `text-2xl`, sem divisória | `CabecalhoPagina`: `text-3xl`, subtítulo `deepgreen/80`, divisória `lightgray` |
| Cards | `rounded-2xl`, `border-deepgreen/10`, sem sombra, número `text-3xl` sem ícone | `rounded-3xl`, `border-lightgray`, `shadow-soft`, número `text-4xl`, ícone em `sage/25` |
| Gráficos | Cores avulsas fora da paleta (`#2E6B4F`, `#5C9670`, `#C1D8B7`) | Valores do `tailwind.config` no SVG, como no `ViewsChart` |
| Destaques | `HighlightCard` escuro e claro, com texto desatualizado ("sem endpoint de moderação") | Não existe no app |
| Tabelas | `rounded-2xl`, cabeçalho `lightgray` cheio, sem hover, sem legenda | Não havia tabela de dados; cartões seguem o `PainelCard` |
| Selos | Âmbar para pendente e em revisão | `PitchStatusBadge`: `sage` para em revisão, `deepgreen` para publicado, vermelho para removido, com ponto |
| Botões de ação | Classes próprias (`rounded-xl`, `min-h-[40px]`) | `BOTAO_PRIMARIO`, `BOTAO_SECUNDARIO` e `BOTAO_PERIGO` de `components/reunioes/estilos.ts` |
| Carregando, vazio e erro | Texto simples "Carregando..." e parágrafo vermelho | Esqueleto com pulso e `AvisoEstado` com ação "Tentar novamente" |
| Avisos de sucesso | Parágrafo `role="status"` na página | Toast (`useToast`) |

## Decisão

1. **Um layout só.** As rotas de `/admin` usam o `AppLayout` (lazy, mesma
   proteção `ProtectedRoute(admin)` em `routes/index.tsx`). `navegacao.ts`
   ganha o perfil `admin` em `CONFIG_PERFIL` (selo ADMIN, cargo padrão
   "Administrador da plataforma", itens Visão geral, Cadastros, Moderação de
   conteúdo e Log de auditoria) e a função `perfilDoLayout`. `PerfilApp` e
   `perfilDoPapel` não mudam, porque são o perfil das regras de negócio
   (reuniões, salvos, gates).
2. **Sidebar sem chamadas novas.** A contagem de solicitações de reunião saiu
   para `ContadorSolicitacoes`, montado só no item que tem contador. O admin
   não tem esse item, então não consulta reuniões; startup e investidor fazem
   a mesma chamada de antes. `ItemMenu` ganhou `end` (Visão geral ativa só em
   `/admin`) e `revisar` ficou opcional (o admin não tem onboarding; o menu do
   rodapé mostra só Sair, que continua chamando `logout()`).
3. **Cabeçalho.** As telas do admin usam o `CabecalhoPagina` de Salvos e Meus
   unios. Não há barra superior: busca de investidores, "Novo Pitch Deck",
   filtros de recomendação e sino não fazem sentido para o admin, e o admin
   não tem notificações. A única busca do admin (Cadastros, por e-mail ou
   nome) fica no formulário de filtros logo abaixo do cabeçalho.
4. **Componentes.**
   - Métricas: o `MetricCard` compartilhado. O antigo do admin foi removido. O
     total de cadastros, que era o `HighlightCard` escuro, virou o quarto
     card e leva a Cadastros.
   - Gráficos: `GaugeCard`, `DonutCard` e `BarListCard` (este era o
     `RegionCard`) foram para `components/dashboard`. Agora usam o
     `PainelCard` e as cores do `tailwind.config`. São decorativos para
     leitores de tela, porque os números estão em texto.
   - Tabela: `DataTable` foi para `components/ui`, com o mesmo cartão dos
     painéis. Também ganhou legenda (`caption`), região rolável com foco e
     hover `lightgray/20`.
   - Selo: `SeloStatus` em `components/ui`, com tons neutro, andamento, ativo
     e perigo. O `PitchStatusBadge` da startup e o `SeloSituacao` do admin
     usam esse selo, então "Em revisão" e "Publicado" têm o mesmo visual dos
     dois lados.
   - Esqueleto: `EsqueletoBlocos` em `components/ui`, no padrão da Visão
     geral da startup.
   - `PainelCard` ganhou `nivel` (h2 ou h3). Cada envio da Moderação de
     conteúdo é um `PainelCard` com título h3 dentro da seção h2.
5. **Removidos:** `AdminLayout`, `AdminSidebar`, `AdminPageHeader`,
   `AvisoPendencia` (sem uso desde a ADR-013), `HighlightCard` e as cópias
   antigas de `MetricCard`, `DataTable`, `DonutCard`, `GaugeCard` e
   `RegionCard`. Em `pages/admin/components` ficam só `ModalConfirmacao` e
   `SeloSituacao`, que são da moderação.

Nenhuma chamada HTTP, serviço, tipo de API ou regra de negócio do admin mudou.

## Tokens e valores avulsos

Não foi criado token novo. O que sobra fora da paleta segue o que o app já usa:

- Vermelhos de erro e de ação destrutiva (`red-50/200/600/700/800`), iguais
  aos dos toasts de erro, do `CAMPO` e dos diálogos de exclusão do perfil.
- Hex só dentro dos SVGs do recharts, com os valores do `tailwind.config`, como
  no `ViewsChart`. O cinza `#A8B0A6` (e `bg-[#A8B0A6]` no ponto da legenda) é
  o mesmo da série "Anterior" do `ViewsChart`.
- Valores entre colchetes do `ModalConfirmacao` (`z-[48]`, `max-h-[94vh]`,
  `sm:max-w-[520px]`, `min-h-[44px]`), iguais aos do `AvaliarReuniaoModal`.
- `min-w-[640px]` na `DataTable`, para a tabela rolar dentro do cartão no
  celular, como a grade de Reuniões faz com `min-w-[560px]`.

## Alternativas

- **Manter o `AdminLayout` e só trocar as classes:** ficariam duas sidebars
  para manter em paralelo. Rejeitada.
- **Pôr `admin` dentro de `PerfilApp`:** mudaria o tipo usado por reuniões,
  salvos, unios e gates, e o admin cairia em código que não é dele. Rejeitada.
  Foi criado `PerfilLayout`.
- **Barra superior vazia no admin, para "ocupar o espaço":** deixaria um
  buraco no layout. Rejeitada. As telas secundárias do app (Salvos, Meus
  unios) já não têm barra superior.

## Consequências

- O admin ganha "Pular para o conteúdo", drawer abaixo de `lg` com Esc, toasts
  e foco visível iguais aos do app.
- Mudanças fora do admin, todas aditivas e sem mudar o visual das outras telas:
  - `navegacao.ts`: perfil admin, `end`, `revisar` opcional e `perfilDoLayout`.
  - `AppSidebar`: contador em componente próprio e cargo por perfil.
  - `AppLayout`: usa `perfilDoLayout`.
  - `PainelCard`: ganhou `nivel`.
  - `PitchStatusBadge`: passou a usar o `SeloStatus`, com as mesmas cores e o
    mesmo ponto de antes, mais `whitespace-nowrap` para o selo não quebrar
    em tabela.
- Os testes do front cobrem mapeamentos e serviços. Nenhum importava os
  arquivos removidos.
