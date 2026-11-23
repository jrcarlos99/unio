from decimal import Decimal, ROUND_HALF_UP

from .models import RecommendationDraft, RecommendationFactor


FACTOR_WEIGHTS: dict[str, int] = {
    "strategic_fit": 30,
    "stage_readiness": 20,
    "ticket_capital_fit": 25,
    "geography_fit": 15,
    "strategic_complementarity": 10,
}

FACTOR_LABELS: dict[str, str] = {
    "strategic_fit": "Segmento e mercado",
    "stage_readiness": "Estágio e prontidão",
    "ticket_capital_fit": "Ticket e capital",
    "geography_fit": "Região",
    "strategic_complementarity": "Complementaridade estratégica",
}
MIN_EVIDENCE_COVERAGE = 60

if sum(FACTOR_WEIGHTS.values()) != 100:
    raise RuntimeError("Os pesos dos fatores de recomendação devem somar 100%.")


def classify(score: int | None) -> str:
    if score is None:
        return "DADOS_INSUFICIENTES"
    if score >= 85:
        return "EXCELENTE"
    if score >= 70:
        return "FORTE"
    if score >= 55:
        return "MODERADO"
    if score >= 40:
        return "FRACO"
    return "SEM_MATCH"


def finalize_assessment(draft: RecommendationDraft) -> tuple[int | None, int, list[RecommendationFactor]]:
    by_code = {factor.factor_code: factor for factor in draft.factors if factor.factor_code in FACTOR_WEIGHTS}
    factors: list[RecommendationFactor] = []
    weighted_total = Decimal("0")
    applied_weight = 0

    for code, weight in FACTOR_WEIGHTS.items():
        assessment = by_code.get(code)
        score = assessment.score if assessment else None
        explanation = assessment.explanation if assessment else "A IA não retornou evidência para este critério."
        factors.append(RecommendationFactor(
            factorCode=code,
            label=FACTOR_LABELS[code],
            score=score,
            weight=weight,
            explanation=explanation,
        ))
        if score is not None:
            weighted_total += Decimal(score) * Decimal(weight)
            applied_weight += weight

    coverage = applied_weight
    if applied_weight < MIN_EVIDENCE_COVERAGE:
        return None, coverage, factors

    # Reescala apenas pelos pesos de critérios com evidência disponível.
    score = int((weighted_total / Decimal(applied_weight)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return max(0, min(100, score)), coverage, factors


def next_step(score: int | None, coverage: int) -> str:
    if score is None:
        return "Complete os dados do perfil e do onboarding para calcular a compatibilidade."
    if coverage < 60:
        return "A compatibilidade é preliminar; complete os dados destacados para aumentar a cobertura da análise."
    if score < 55:
        return "Revise o alinhamento de segmento, estágio e capital antes de avançar."
    if score < 85:
        return "Revise os critérios de atenção e confirme o alinhamento estratégico."
    return "Analise os pontos fortes e avance para conversar sobre a oportunidade."
