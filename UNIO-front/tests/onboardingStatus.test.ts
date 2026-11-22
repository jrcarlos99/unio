// Status do onboarding entre front e /api/profile/onboarding (ADR-007).
// Rodar com: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { statusOnboardingDoBack, statusOnboardingParaBack } from "../src/services/onboardingService.ts";

test("statusOnboardingDoBack: CONCLUIDO e PULADO liberam; o resto é pendente", () => {
  assert.equal(statusOnboardingDoBack("CONCLUIDO"), "concluido");
  assert.equal(statusOnboardingDoBack("PULADO"), "pulado");
  assert.equal(statusOnboardingDoBack("PENDENTE"), "pendente");
  assert.equal(statusOnboardingDoBack(undefined), "pendente");
  assert.equal(statusOnboardingDoBack("concluido"), "pendente");
});

test("statusOnboardingParaBack: ida e volta", () => {
  for (const status of ["pendente", "concluido", "pulado"] as const) {
    assert.equal(statusOnboardingDoBack(statusOnboardingParaBack(status)), status);
  }
});
