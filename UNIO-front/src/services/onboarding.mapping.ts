/*
 * MAPEAMENTO ONBOARDING (front) x BACK, para levar ao squad do back
 * ===================================================================
 * Desde 2026-11-07 o onboarding é o único caminho de criação de perfil
 * (docs/adr/ADR-001). No último passo, quem ainda não tem perfil chama
 * POST /api/profile/startup ou POST /api/profile/investor com o corpo montado
 * por services/perfilFromOnboarding.ts (tabelas de conversão em
 * docs/adr/ADR-002; back: D028 a D030 em unio/docs/decisoes.md). As respostas
 * completas do wizard também vão para o JSON livre de /api/profile/onboarding,
 * na chave "onboarding" (docs/adr/ADR-003).
 *
 * Legenda: [ENVIADO] = vai no POST de criação | [CONVERTIDO] = vai no POST
 * depois de conversão | [SÓ ONBOARDING] = fica só em respostas.onboarding
 * (o DTO não tem o campo).
 *
 * ---------------------------------------------------------------------
 * INVESTIDOR / MENTOR  (front: types/onboarding.ts > RespostasInvestidor;
 *                       back: InvestorCreateRequest / entity Investor)
 * ---------------------------------------------------------------------
 * Passo 1 · Segmentos de interesse
 *   segmentosInteresse: string[]       -> segmentosInteresse: List<String>   [ENVIADO]
 *
 * Passo 2 · Estágios das startups
 *   estagiosInteresse: string[]        -> estagiosInteresse: List<String>    [ENVIADO]
 *   preferenciasStartup: string[]      -> (não existe)                       [SÓ ONBOARDING]
 *
 * Passo 3 · Ticket e disponibilidade
 *   ticketMedio: faixa em texto        -> ticketMinimo + ticketMaximo        [CONVERTIDO]
 *     Tabela TICKETS_POR_FAIXA. Opcionais no back (D029): mentor sem faixa
 *     não envia nenhum dos dois.
 *   apenasMentor: boolean              -> perfilRisco: "Mentor"              [CONVERTIDO]
 *     Sem apenasMentor: "Investidor Anjo" (TIPOS_PERFIL). O back grava
 *     "Investidor Anjo" quando o campo falta (D030).
 *   disponibilidade: "Baixa"|"Média"|"Alta" -> BAIXA | MEDIA | ALTA          [CONVERTIDO]
 *   formasInteracao: string[]          -> (não existe)                       [SÓ ONBOARDING]
 *
 * Passo 4 · Região
 *   regioesInteresse: string[]         -> regiaoInteresse: String            [CONVERTIDO]
 *     Juntas por vírgula, sem espaço ("Nordeste,Pernambuco"), como o CSV
 *     que o back usa; o REGIAO_FIT separa por vírgula.
 *   consentimentoLgpd: boolean         -> (não existe)                       [SÓ ONBOARDING]
 *     Obrigatório para concluir. Proposta de registro no ConsentController
 *     em docs/adr/ADR-001 (não ligada).
 *
 * ---------------------------------------------------------------------
 * STATUS DO ONBOARDING (os dois perfis)
 * ---------------------------------------------------------------------
 *   "concluido" | "pulado" (+ data)    -> (não enviado)                      [localStorage]
 *     Chave unio_onboarding_<email>. Conta sem perfil é sempre tratada como
 *     pendente (onboardingService.statusEfetivo).
 *
 * ---------------------------------------------------------------------
 * STARTUP  (front: types/onboarding.ts > RespostasStartup;
 *            back: StartupCreateRequest / entity Startup)
 * ---------------------------------------------------------------------
 * Passo 1 · Nome, segmento e estágio
 *   nome: string                  -> nome: String (obrigatório, até 255)  [ENVIADO]
 *   segmento: string              -> segmento: String                     [ENVIADO]
 *   estagio: string               -> estagio: String                      [ENVIADO]
 *
 * Passo 2 · O que busca
 *   necessidades: string[]        -> (não existe)                         [SÓ ONBOARDING]
 *   capitalProcurado: faixa       -> capitalProcurado: BigDecimal         [CONVERTIDO]
 *     Tabela CAPITAL_PROCURADO_POR_FAIXA. Só enviado quando "Investimento"
 *     está entre as necessidades; opcional no back (D029).
 *
 * Passo 3 · Localização e tração
 *   localizacao: string           -> localizacao: String                  [ENVIADO]
 *   tracao: string[]              -> (não existe)                         [SÓ ONBOARDING]
 *   tamanhoEquipe: string         -> (não existe)                         [SÓ ONBOARDING]
 *
 * Passo 4 · Modelo de negócio
 *   modeloNegocio: string         -> modeloNegocio: String                [ENVIADO]
 *   mercadoAlvo: string           -> mercadoAlvo: String                  [ENVIADO]
 *   pitch: string (até 140)       -> pitchCanvas: TEXT                    [ENVIADO se preenchido]
 *   consentimentoLgpd: boolean    -> (não existe)                         [SÓ ONBOARDING]
 *   disponibilidade               -> não perguntada; não enviada
 */

export {};
