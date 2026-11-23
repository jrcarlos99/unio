import os
from typing import Any

from fastapi import FastAPI, HTTPException
from openai import AuthenticationError, OpenAI
from pydantic_settings import BaseSettings, SettingsConfigDict

from .models import Recommendation, RecommendationRequest, RecommendationResponse
from .prompts import SYSTEM_PROMPT, build_prompt


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"


settings = Settings()
app = FastAPI(title="UNIO Agente de IA", version="1.0.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "configured": str(bool(settings.openai_api_key)).lower()}


@app.post("/v1/recommendations", response_model=RecommendationResponse)
def recommendations(request: RecommendationRequest) -> RecommendationResponse:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY não configurada")
    if not request.candidates:
        return RecommendationResponse(
            candidateType=request.candidate_type,
            recommendations=[],
        )

    client = OpenAI(api_key=settings.openai_api_key)
    try:
        completion = client.chat.completions.create(
            model=settings.openai_model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_prompt(request)},
            ],
        )
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Resposta vazia")
        result = RecommendationResponse.model_validate_json(content)
    except AuthenticationError as error:
        raise HTTPException(
            status_code=502,
            detail="A OpenAI rejeitou a OPENAI_API_KEY. Gere uma chave válida no painel da OpenAI.",
        ) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail="Falha ao consultar o modelo de IA") from error

    allowed = {candidate.candidate_id: candidate.candidate_name for candidate in request.candidates}
    cleaned: list[Recommendation] = []
    seen: set[int] = set()
    for recommendation in result.recommendations:
        if recommendation.candidate_id not in allowed or recommendation.candidate_id in seen:
            continue
        cleaned.append(
            recommendation.model_copy(
                update={
                    "candidate_name": allowed[recommendation.candidate_id],
                    "compatibility": max(0, min(100, recommendation.compatibility)),
                }
            )
        )
        seen.add(recommendation.candidate_id)
        if len(cleaned) >= request.limit:
            break

    return RecommendationResponse(
        candidateType=request.candidate_type,
        recommendations=cleaned,
    )
