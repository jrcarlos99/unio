import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  contarNaoVistos,
  marcarComoVistos,
  semOInteresse,
} from "../services/interessesRecebidos.mapping";
import {
  assinarRetribuicoes,
  contarInteressesRecebidos,
  gravarVistos,
  lerVistos,
  listarInteressesRecebidos,
  retribuirInteresse,
} from "../services/interessesRecebidosService";
import { chaveUsuario } from "../services/onboardingService";
import type { InteressesRecebidos } from "../types/interesses";

// De quanto em quanto tempo o sino confere a contagem (só com a aba visível)
export const INTERVALO_INTERESSES_MS = 60_000;

interface Estado {
  userKey: string;
  recebidos?: InteressesRecebidos;
  erro?: boolean;
}

// Interesses recebidos do usuário logado para o sino (ADR-015). Carrega a
// lista ao montar (entrar na tela) e quando `recarregar` é chamado (reabrir o
// sino). A cada 60 s, com a aba visível, confere só a contagem
// (GET /api/interests/received/count) e baixa a lista de novo se ela mudou.
// Sem websocket e sem polling com a aba escondida.
export function useInteressesRecebidos() {
  const { user } = useAuth();
  const participa = user?.role === "startup" || user?.role === "investidor";
  const userKey = user && participa ? chaveUsuario(user) : "";

  const [estado, setEstado] = useState<Estado | null>(null);
  const [versao, setVersao] = useState(0);
  const [vistos, setVistos] = useState<{ userKey: string; lista: string[] }>({ userKey: "", lista: [] });
  const totalConhecido = useRef<number | null>(null);

  // Lista (entrar na tela e reabrir o sino)
  useEffect(() => {
    if (!userKey) return;
    let ativo = true;
    listarInteressesRecebidos()
      .then((recebidos) => {
        if (!ativo) return;
        totalConhecido.current = recebidos.total;
        setEstado({ userKey, recebidos });
      })
      .catch(() => {
        if (ativo) setEstado((anterior) => ({ userKey, recebidos: anterior?.recebidos, erro: true }));
      });
    return () => {
      ativo = false;
    };
  }, [userKey, versao]);

  // Contagem leve a cada 60 s com a aba visível, e ao voltar para a aba
  useEffect(() => {
    if (!userKey || typeof window === "undefined") return;
    const conferir = () => {
      if (document.visibilityState !== "visible") return;
      contarInteressesRecebidos()
        .then((total) => {
          if (total !== totalConhecido.current) setVersao((v) => v + 1);
        })
        .catch(() => undefined);
    };
    const temporizador = window.setInterval(conferir, INTERVALO_INTERESSES_MS);
    document.addEventListener("visibilitychange", conferir);
    return () => {
      window.clearInterval(temporizador);
      document.removeEventListener("visibilitychange", conferir);
    };
  }, [userKey]);

  // Retribuído pelo sino ou por um card: sai da lista na hora
  useEffect(
    () =>
      assinarRetribuicoes(({ id }) =>
        setEstado((anterior) => {
          if (!anterior?.recebidos) return anterior;
          const recebidos = semOInteresse(anterior.recebidos, id);
          totalConhecido.current = recebidos.total;
          return { ...anterior, recebidos };
        }),
      ),
    [],
  );

  const atual = estado && estado.userKey === userKey ? estado : null;
  const recebidos = atual?.recebidos ?? null;
  const listaVistos = vistos.userKey === userKey ? vistos.lista : lerVistos(userKey);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);

  const marcarVistos = useCallback(() => {
    if (!userKey || !recebidos) return;
    const lista = marcarComoVistos(recebidos);
    gravarVistos(userKey, lista);
    setVistos({ userKey, lista });
  }, [recebidos, userKey]);

  return {
    ativo: Boolean(userKey),
    carregando: Boolean(userKey) && atual === null,
    erro: Boolean(atual?.erro) && !recebidos,
    recebidos,
    vistos: listaVistos,
    naoVistos: recebidos ? contarNaoVistos(recebidos, listaVistos) : 0,
    recarregar,
    marcarVistos,
    retribuir: retribuirInteresse,
  };
}
