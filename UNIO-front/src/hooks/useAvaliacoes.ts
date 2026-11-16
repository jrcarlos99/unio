import { useEffect, useRef, useState } from "react";
import {
  assinarAvaliacoes,
  jaAvaliou,
  listarPendentesDeAvaliacao,
  obterPopularidade,
  registrarVisitaPerfil,
} from "../services/avaliacoesService";
import { assinarReunioes, type SessaoReunioes } from "../services/reunioesService";
import type { Popularidade } from "../types/avaliacoes";
import type { Reuniao } from "../types/reunioes";

// Muda a cada aviso das reuniões (ex.: "Compareci", nota de exemplo da outra
// parte) ou das avaliações (avaliação enviada)
function useVersaoAvaliacoes() {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const somar = () => setVersao((v) => v + 1);
    const pararReunioes = assinarReunioes(somar);
    const pararAvaliacoes = assinarAvaliacoes(somar);
    return () => {
      pararReunioes();
      pararAvaliacoes();
    };
  }, []);
  return versao;
}

// Reuniões realizadas que o usuário ainda não avaliou
export function usePendentesAvaliacao(sessao: SessaoReunioes): Reuniao[] {
  const versao = useVersaoAvaliacoes();
  const [pendentes, setPendentes] = useState<Reuniao[]>([]);

  useEffect(() => {
    let ativo = true;
    listarPendentesDeAvaliacao(sessao)
      .then((lista) => {
        if (ativo) setPendentes(lista);
      })
      .catch(() => {
        // sem aviso se falhar
      });
    return () => {
      ativo = false;
    };
  }, [sessao, versao]);

  return pendentes;
}

// null enquanto carrega
export function useJaAvaliou(sessao: SessaoReunioes, reuniaoId: string): boolean | null {
  const versao = useVersaoAvaliacoes();
  const [estado, setEstado] = useState<{ chave: string; valor: boolean } | null>(null);
  const chave = `${reuniaoId}:${versao}`;

  useEffect(() => {
    let ativo = true;
    jaAvaliou(sessao, reuniaoId)
      .then((valor) => {
        if (ativo) setEstado({ chave, valor });
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [sessao, reuniaoId, chave]);

  return estado?.chave === chave ? estado.valor : null;
}

interface EstadoPopularidade {
  carregando: boolean;
  erro: boolean;
  dados: Popularidade | null;
}

// Popularidade do usuário logado (card da Visão geral e aba do perfil)
export function usePopularidade(sessao: SessaoReunioes): EstadoPopularidade {
  const versao = useVersaoAvaliacoes();
  const [estado, setEstado] = useState<{ chave: string; erro: boolean; dados: Popularidade | null } | null>(null);
  const chave = `${sessao.user?.email ?? ""}:${sessao.perfil}:${versao}`;

  useEffect(() => {
    let ativo = true;
    obterPopularidade(sessao)
      .then((dados) => {
        if (ativo) setEstado({ chave, erro: false, dados });
      })
      .catch(() => {
        if (ativo) setEstado({ chave, erro: true, dados: null });
      });
    return () => {
      ativo = false;
    };
  }, [sessao, chave]);

  // Ao recarregar (nova versão) mantém os números anteriores na tela
  if (!estado) return { carregando: true, erro: false, dados: null };
  return { carregando: false, erro: estado.erro, dados: estado.dados };
}

// Registra uma visita ao perfil aberto (PerfilStartup e PerfilInvestidor),
// uma vez por abertura. Não mostra nem guarda quem visitou.
export function useRegistrarVisita(sessao: SessaoReunioes, perfilAlvoId: string) {
  const registrado = useRef<string | null>(null);
  useEffect(() => {
    if (!perfilAlvoId || !sessao.user || registrado.current === perfilAlvoId) return;
    registrado.current = perfilAlvoId;
    void registrarVisitaPerfil(sessao, perfilAlvoId).catch(() => undefined);
  }, [sessao, perfilAlvoId]);
}
