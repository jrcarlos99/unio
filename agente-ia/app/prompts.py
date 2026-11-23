import json
from typing import Any

from .models import RecommendationRequest
from .scoring import FACTOR_LABELS, FACTOR_WEIGHTS


SYSTEM_PROMPT = """Você é o agente de recomendação da plataforma UNIO.
Avalie o alinhamento entre o perfil atual e cada candidato usando somente os dados
recebidos. Para cada critério, devolva uma nota inteira de 0 a 100 e uma justificativa
curta baseada em campos concretos. Se não houver evidência suficiente para um critério,
use score null e explique quais dados faltam. Não trate ausência de informação como
incompatibilidade nem invente informações. Não use nome, e-mail ou qualquer dado pessoal
como critério. Considere respostas do onboarding apenas quando expressarem preferência
de investimento, estágio, segmento, região, disponibilidade, risco ou estratégia.

Avalie estes critérios, exatamente uma vez cada:
- strategic_fit: alinhamento entre segmento, mercado-alvo, problema e tese. Peso 30.
- stage_readiness: alinhamento entre estágio da startup e estágios aceitos pelo investidor. Peso 20.
- ticket_capital_fit: adequação entre capital procurado e faixa/ticket do investidor. Peso 25.
- geography_fit: compatibilidade entre localização e regiões de interesse. Peso 15.
- strategic_complementarity: compatibilidade de modelo de negócio, necessidades,
  disponibilidade, perfil de risco e capacidades estratégicas descritas nos dados. Peso 10.

Não calcule o total. O serviço validará suas notas, aplicará os pesos e calculará a
classificação. Se houver dados em conflito, explique a divergência em attentionPoints.
Retorne apenas JSON válido, sem markdown. Não omita candidatos apenas por terem notas
baixas; não recomende IDs fora da lista."""


def build_prompt(request: RecommendationRequest) -> str:
    profile = {
        key: value for key, value in request.profile.items()
        if key not in {"candidateId", "candidateName", "email"}
    }
    candidates = []
    for candidate in request.candidates:
        data = candidate.model_dump(by_alias=True)
        data.pop("candidateName", None)
        data.pop("email", None)
        candidates.append(data)
    context: dict[str, Any] = {
        "candidateType": request.candidate_type,
        "perfilAtual": profile,
        "respostasOnboarding": request.onboarding,
        "pesosELabels": [
            {"factorCode": code, "label": FACTOR_LABELS[code], "weight": FACTOR_WEIGHTS[code]}
            for code in FACTOR_WEIGHTS
        ],
        "candidatos": candidates,
    }
    return (
        f"Avalie todos os candidatos e retorne no máximo {request.limit}, escolhendo os mais alinhados. "
        "O JSON deve seguir este formato: "
        '{"candidateType":"STARTUP ou INVESTOR","recommendations":['
        '{"candidateId":1,"summary":"...","strengths":["..."],'
        '"attentionPoints":["..."],"factors":['
        '{"factorCode":"strategic_fit","score":0,"explanation":"..."}]}]}\n\n'
        + json.dumps(context, ensure_ascii=False)
    )
