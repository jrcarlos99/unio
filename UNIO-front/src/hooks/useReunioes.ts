import { useCallback, useEffect, useMemo, useState } from "react";
import { perfilDoPapel } from "../components/layout/navegacao";
import { useAuth } from "../contexts/AuthContext";
import {
  assinarReunioes,
  contarSolicitacoesRecebidas,
  listarReunioes,
  type SessaoReunioes,
} from "../services/reunioesService";
import type { Reuniao } from "../types/reunioes";

// Sessão do serviço de reuniões: usuário logado + perfil (estável por usuário)
export function useSessaoReunioes(): SessaoReunioes {
  const { user } = useAuth();
  return useMemo(() => ({ user, perfil: perfilDoPapel(user?.role) }), [user]);
}

interface EstadoReunioes {
  sessao: SessaoReunioes;
  reunioes?: Reuniao[];
  erro?: string;
}

// Todas as reuniões do usuário, recarregadas sempre que o serviço avisa uma
// mudança (resposta do mock, ação em outro componente). `onAviso` recebe os
// avisos da outra parte (ex.: "Verde Pay aceitou sua solicitação...").
export function useReunioes(sessao: SessaoReunioes, onAviso?: (aviso: string) => void) {
  const [estado, setEstado] = useState<EstadoReunioes | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    listarReunioes(sessao)
      .then((reunioes) => {
        if (ativo) setEstado({ sessao, reunioes });
      })
      .catch(() => {
        if (ativo) setEstado({ sessao, erro: "Não foi possível carregar suas reuniões." });
      });
    return () => {
      ativo = false;
    };
  }, [sessao, versao]);

  useEffect(
    () =>
      assinarReunioes((aviso) => {
        setVersao((v) => v + 1);
        if (aviso) onAviso?.(aviso);
      }),
    [onAviso],
  );

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  const atual = estado?.sessao === sessao ? estado : null;

  return {
    carregando: atual === null,
    erro: atual?.erro ?? null,
    reunioes: atual?.reunioes ?? [],
    recarregar,
  };
}

// Bolinha da sidebar: solicitações recebidas aguardando resposta
export function useSolicitacoesRecebidas() {
  const sessao = useSessaoReunioes();
  const [contagem, setContagem] = useState(0);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    contarSolicitacoesRecebidas(sessao)
      .then((total) => {
        if (ativo) setContagem(total);
      })
      .catch(() => {
        // sem bolinha se falhar
      });
    return () => {
      ativo = false;
    };
  }, [sessao, versao]);

  useEffect(() => assinarReunioes(() => setVersao((v) => v + 1)), []);

  return sessao.user ? contagem : 0;
}
