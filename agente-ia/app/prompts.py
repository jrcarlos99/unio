import json
from typing import Any

from .models import RecommendationRequest


SYSTEM_PROMPT = """Você é o agente de matchmaking da plataforma UNIO.
Sua tarefa é recomendar candidatos para o perfil atual usando somente os dados recebidos.
Considere segmento, estágio, capital, região, modelo de negócio, mercado-alvo,
necessidades e respostas do onboarding.
Não invente dados, não recomende IDs que não estejam na lista e seja objetivo.
A compatibilidade deve ser um número inteiro de 0 a 100.
"""


def build_prompt(request: RecommendationRequest) -> str:
    context: dict[str, Any] = {
        "perfilAtual": request.profile,
        "respostasOnboarding": request.onboarding,
        "candidatos": [candidate.model_dump(by_alias=True) for candidate in request.candidates],
    }
    return (
        f"Recomende até {request.limit} candidatos. "
        "Retorne exclusivamente um JSON no formato "
        '{"candidateType":"STARTUP ou INVESTOR","recommendations":['
        '{"candidateId":1,"candidateName":"Nome","compatibility":0,'
        '"summary":"...","strengths":["..."],"attentionPoints":["..."]}]}\n\n'
        + json.dumps(context, ensure_ascii=False)
    )
