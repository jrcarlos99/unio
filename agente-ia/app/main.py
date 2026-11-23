import hashlib
import json
import threading
import time
from typing import Any

from fastapi import FastAPI, HTTPException
from openai import AuthenticationError, OpenAI
from pydantic_settings import BaseSettings, SettingsConfigDict

from .models import (
    Recommendation,
    RecommendationDraftResponse,
    RecommendationRequest,
    RecommendationResponse,
)
from .prompts import SYSTEM_PROMPT, build_prompt
from .scoring import classify, finalize_assessment, next_step


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_timeout_seconds: float = 35.0
    recommendation_cache_ttl_seconds: int = 300


settings = Settings()
app = FastAPI(title="UNIO Agente de IA", version="2.0.0")
_cache: dict[str, tuple[float, RecommendationResponse]] = {}
_cache_lock = threading.Lock()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "configured": str(bool(settings.openai_api_key)).lower()}


def _cache_key(request: RecommendationRequest) -> str:
    payload = json.dumps(request.model_dump(by_alias=True), ensure_ascii=False, sort_keys=True, default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _cached(key: str) -> RecommendationResponse | None:
    now = time.monotonic()
    with _cache_lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        expires_at, response = entry
        if expires_at <= now:
            _cache.pop(key, None)
            return None
        return response.model_copy(deep=True)


def _store(key: str, response: RecommendationResponse) -> None:
    expires_at = time.monotonic() + max(0, settings.recommendation_cache_ttl_seconds)
    with _cache_lock:
        _cache[key] = (expires_at, response.model_copy(deep=True))
        now = time.monotonic()
        for old_key, (old_expiry, _) in list(_cache.items()):
            if old_expiry <= now:
                _cache.pop(old_key, None)


def _candidate_profile(candidate: Any) -> dict[str, Any]:
    data = candidate.model_dump(by_alias=True)
    return {
        key: value
        for key, value in data.items()
        if key not in {"candidateId", "candidateName", "respostasOnboarding"}
    }


def _evaluate(request: RecommendationRequest) -> RecommendationResponse:
    client = OpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.openai_timeout_seconds,
        max_retries=1,
    )
    try:
        completion = client.chat.completions.create(
            model=settings.openai_model,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": build_prompt(request)},
            ],
        )
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Resposta vazia")
        draft = RecommendationDraftResponse.model_validate_json(content)
    except AuthenticationError as error:
        raise HTTPException(
            status_code=502,
            detail="A OpenAI rejeitou a OPENAI_API_KEY. Gere uma chave válida no painel da OpenAI.",
        ) from error
    except Exception as error:
        raise HTTPException(status_code=502, detail="Falha ao consultar ou validar a resposta do agente de IA") from error

    if draft.candidate_type != request.candidate_type:
        raise HTTPException(status_code=502, detail="O agente de IA retornou um tipo de candidato inválido")

    allowed = {candidate.candidate_id: candidate for candidate in request.candidates}
    cleaned: list[Recommendation] = []
    seen: set[int] = set()
    for assessment in draft.recommendations:
        candidate = allowed.get(assessment.candidate_id)
        if candidate is None or candidate.candidate_id in seen:
            continue

        score, coverage, factors = finalize_assessment(assessment)
        cleaned.append(Recommendation(
            candidateId=candidate.candidate_id,
            candidateName=candidate.candidate_name,
            candidateProfile=_candidate_profile(candidate),
            compatibility=score,
            classification=classify(score),
            dataCoverage=coverage,
            summary=assessment.summary,
            strengths=assessment.strengths,
            attentionPoints=assessment.attention_points,
            factors=factors,
            nextStep=next_step(score, coverage),
        ))
        seen.add(candidate.candidate_id)

    # A ordenação final pertence ao agente: usa o total calculado com a fórmula publicada.
    cleaned.sort(key=lambda item: (
        item.compatibility is not None,
        item.compatibility if item.compatibility is not None else -1,
        -item.candidate_id,
    ), reverse=True)
    return RecommendationResponse(candidateType=request.candidate_type, recommendations=cleaned[:request.limit])


@app.post("/v1/recommendations", response_model=RecommendationResponse)
def recommendations(request: RecommendationRequest) -> RecommendationResponse:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY não configurada")
    if not request.candidates:
        return RecommendationResponse(candidateType=request.candidate_type, recommendations=[])

    key = _cache_key(request)
    cached = _cached(key)
    if cached is not None:
        return cached

    response = _evaluate(request)
    _store(key, response)
    return response
