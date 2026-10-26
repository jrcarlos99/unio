import { useCallback, useMemo } from "react";
import { getApiErrorMessage } from "../services/api";
import { getTeam, saveTeam } from "../services/teamService";
import type { TeamMember, TeamMemberFormValues } from "../types/team";
import { TEAM_MAX_MEMBERS, TeamStorageError, sortMembers, toTeamMember } from "../utils/team";
import { useCarregamento } from "./useDescoberta";
import { useToast } from "./useToast";

const LOAD_ERROR = "Não foi possível carregar a equipe da startup.";
const SAVE_ERROR = "Não foi possível salvar a equipe. Tente novamente.";
const LIMIT_ERROR = `A equipe pode ter no máximo ${TEAM_MAX_MEMBERS} membros.`;

export function useStartupTeam() {
  const { mostrar } = useToast();
  const { carregando, erro, dados, recarregar, alterarDados } = useCarregamento(getTeam, LOAD_ERROR);

  const members = useMemo(() => (dados ? sortMembers(dados) : []), [dados]);

  const persist = useCallback(
    async (next: TeamMember[], successMessage: string): Promise<string | null> => {
      try {
        const stored = await saveTeam(next);
        alterarDados(() => stored);
        mostrar(successMessage, "sucesso");
        return null;
      } catch (error) {
        return error instanceof TeamStorageError ? error.message : getApiErrorMessage(error, SAVE_ERROR);
      }
    },
    [alterarDados, mostrar],
  );

  // id null = new member
  const saveMember = useCallback(
    (values: TeamMemberFormValues, id: string | null) => {
      if (!dados) return Promise.resolve(SAVE_ERROR);
      const existing = id ? dados.find((member) => member.id === id) : undefined;
      if (!existing && dados.length >= TEAM_MAX_MEMBERS) return Promise.resolve(LIMIT_ERROR);
      const member = toTeamMember(values, existing);
      const next = existing
        ? dados.map((item) => (item.id === existing.id ? member : item))
        : [...dados, member];
      return persist(next, existing ? "Membro atualizado." : "Membro adicionado à equipe.");
    },
    [dados, persist],
  );

  const removeMember = useCallback(
    (id: string) => {
      if (!dados) return Promise.resolve(SAVE_ERROR);
      return persist(
        dados.filter((member) => member.id !== id),
        "Membro removido da equipe.",
      );
    },
    [dados, persist],
  );

  return {
    loading: carregando,
    loadError: erro,
    reload: recarregar,
    members,
    count: dados ? dados.length : null,
    canAdd: dados !== null && dados.length < TEAM_MAX_MEMBERS,
    saveMember,
    removeMember,
  };
}

export type StartupTeam = ReturnType<typeof useStartupTeam>;
