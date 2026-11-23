from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Candidate(BaseModel):
    model_config = ConfigDict(extra="allow")

    candidate_id: int = Field(alias="candidateId")
    candidate_name: str = Field(alias="candidateName")


class RecommendationRequest(BaseModel):
    candidate_type: str = Field(alias="candidateType")
    profile: dict[str, Any] = Field(alias="perfilAtual")
    onboarding: dict[str, Any] = Field(alias="respostasOnboarding")
    candidates: list[Candidate] = Field(alias="candidatos")
    limit: int = Field(default=10, ge=1, le=20)


class Recommendation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    candidate_id: int = Field(alias="candidateId")
    candidate_name: str = Field(alias="candidateName")
    compatibility: int = Field(ge=0, le=100)
    summary: str
    strengths: list[str] = Field(default_factory=list)
    attention_points: list[str] = Field(default_factory=list, alias="attentionPoints")


class RecommendationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    candidate_type: str = Field(alias="candidateType")
    recommendations: list[Recommendation]
