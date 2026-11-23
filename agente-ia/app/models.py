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


class FactorAssessment(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    factor_code: str = Field(alias="factorCode")
    score: int | None = Field(default=None, ge=0, le=100)
    explanation: str = Field(min_length=1, max_length=500)


class RecommendationDraft(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    candidate_id: int = Field(alias="candidateId")
    summary: str = Field(min_length=1, max_length=600)
    strengths: list[str] = Field(default_factory=list, max_length=5)
    attention_points: list[str] = Field(default_factory=list, alias="attentionPoints", max_length=5)
    factors: list[FactorAssessment] = Field(default_factory=list)


class RecommendationDraftResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    candidate_type: str = Field(alias="candidateType")
    recommendations: list[RecommendationDraft]


class RecommendationFactor(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    factor_code: str = Field(alias="factorCode")
    label: str
    score: int | None = Field(ge=0, le=100)
    weight: int
    explanation: str = Field(max_length=500)


class Recommendation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    candidate_id: int = Field(alias="candidateId")
    candidate_name: str = Field(alias="candidateName")
    candidate_profile: dict[str, Any] = Field(alias="candidateProfile")
    compatibility: int | None = Field(ge=0, le=100)
    classification: str
    data_coverage: int = Field(alias="dataCoverage", ge=0, le=100)
    summary: str
    strengths: list[str] = Field(default_factory=list)
    attention_points: list[str] = Field(default_factory=list, alias="attentionPoints")
    factors: list[RecommendationFactor] = Field(default_factory=list)
    next_step: str = Field(alias="nextStep")


class RecommendationResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    candidate_type: str = Field(alias="candidateType")
    recommendations: list[Recommendation]
