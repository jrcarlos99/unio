import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  ONBOARDING_CONFIG,
  type ConfigOnboarding,
  type PerfilComOnboarding,
  type RespostasPorPerfil,
} from "../pages/onboarding/config";
import {
  chaveUsuario,
  loadAnswers,
  markCompleted,
  markSkipped,
  saveAnswers,
} from "../services/onboardingService";
import {
  criarPerfilPeloOnboarding,
  ErroCriacaoPerfil,
  salvarRespostasOnboardingNoBack,
  type TipoErroCriacaoPerfil,
} from "../services/perfilOnboardingService";

export interface ErroEnvioOnboarding {
  tipo: TipoErroCriacaoPerfil;
  mensagem: string;
}

export interface OnboardingState<T> {
  respostas: T;
  atualizar: (parcial: Partial<T>) => void;
  // true enquanto as respostas salvas ainda estão sendo carregadas
  carregando: boolean;
  // true enquanto conclui/pula (pra desabilitar os botões)
  ocupado: boolean;
  // false = a conta ainda não tem perfil: o onboarding é obrigatório, não
  // pode ser pulado e o último passo cria o perfil (ADR-001)
  temPerfil: boolean;
  // Falha ao criar o perfil no último passo (as respostas continuam na tela)
  erroEnvio: ErroEnvioOnboarding | null;
  etapas: string[];
  passo: number;
  totalPassos: number;
  passoValido: boolean;
  next: () => void;
  back: () => void;
  goTo: (passo: number) => void;
  finish: () => Promise<void>;
  skip: () => Promise<void>;
}

// Estado do wizard de onboarding de um perfil: respostas (salvas a cada
// mudança, pra sobreviver a um reload), validação e navegação entre passos.
// O passo atual fica na URL (?passo=2), então o voltar do navegador também
// funciona.
export function useOnboarding<P extends PerfilComOnboarding>(
  perfil: P,
): OnboardingState<RespostasPorPerfil[P]> {
  type T = RespostasPorPerfil[P];
  const config = ONBOARDING_CONFIG[perfil] as ConfigOnboarding<T>;
  const totalPassos = config.etapas.length;

  const { user, refreshProfile } = useAuth();
  const userKey = user ? chaveUsuario(user) : "";
  const temPerfil = user?.perfilCompleto !== false;
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [respostas, setRespostas] = useState<T>(config.respostasIniciais);
  // Guarda pra qual usuário as respostas já foram carregadas
  const [carregadoPara, setCarregadoPara] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<ErroEnvioOnboarding | null>(null);
  // Trava síncrona contra clique duplo (o estado "ocupado" só vale no próximo render)
  const enviando = useRef(false);
  const carregando = carregadoPara !== userKey;

  useEffect(() => {
    let ativo = true;
    loadAnswers<T>(userKey, perfil).then((salvas) => {
      if (!ativo) return;
      setRespostas({ ...config.respostasIniciais, ...salvas });
      setCarregadoPara(userKey);
    });
    return () => {
      ativo = false;
    };
  }, [config, perfil, userKey]);

  useEffect(() => {
    if (carregando || !userKey) return;
    void saveAnswers(userKey, perfil, respostas);
  }, [carregando, perfil, respostas, userKey]);

  // O passo pedido na URL só vale se todos os anteriores estiverem válidos;
  // senão, para no primeiro passo incompleto (ex.: alguém digitou ?passo=4).
  const passoPedido = Number(params.get("passo"));
  const passo = useMemo(() => {
    const pedido = Number.isInteger(passoPedido)
      ? Math.min(Math.max(passoPedido, 1), totalPassos)
      : 1;
    for (let anterior = 1; anterior < pedido; anterior++) {
      if (!config.validarPasso(anterior, respostas)) return anterior;
    }
    return pedido;
  }, [config, passoPedido, respostas, totalPassos]);

  // Mantém a URL igual ao passo realmente exibido
  useEffect(() => {
    if (!carregando && passoPedido !== passo) {
      setParams({ passo: String(passo) }, { replace: true });
    }
  }, [carregando, passo, passoPedido, setParams]);

  const passoValido = config.validarPasso(passo, respostas);

  const atualizar = useCallback((parcial: Partial<T>) => {
    setRespostas((atual) => ({ ...atual, ...parcial }));
  }, []);

  const goTo = useCallback(
    (destino: number) => {
      if (destino < 1 || destino > totalPassos) return;
      setParams({ passo: String(destino) });
    },
    [setParams, totalPassos],
  );

  const next = useCallback(() => {
    if (passoValido) goTo(passo + 1);
  }, [goTo, passo, passoValido]);

  const back = useCallback(() => goTo(passo - 1), [goTo, passo]);

  const finish = useCallback(async () => {
    const tudoValido = config.etapas.every((_, indice) =>
      config.validarPasso(indice + 1, respostas),
    );
    if (!tudoValido || enviando.current) return;
    enviando.current = true;
    setOcupado(true);
    setErroEnvio(null);
    try {
      // Quem já tem perfil só conclui o onboarding: o POST não é repetido
      if (!temPerfil) {
        await criarPerfilPeloOnboarding(perfil, respostas);
        await refreshProfile();
        void salvarRespostasOnboardingNoBack(perfil, respostas);
      }
      await markCompleted(userKey, perfil, respostas);
      navigate(config.rotaHome, {
        replace: true,
        state: temPerfil ? undefined : { cadastroSucesso: true },
      });
    } catch (error) {
      if (error instanceof ErroCriacaoPerfil) {
        setErroEnvio({ tipo: error.tipo, mensagem: error.message });
      } else {
        // refreshProfile falhou depois do POST: tentar de novo cai no 409,
        // que conta como sucesso
        setErroEnvio({
          tipo: "rede",
          mensagem: "Seu perfil foi enviado, mas não conseguimos confirmar. Tente novamente.",
        });
      }
    } finally {
      enviando.current = false;
      setOcupado(false);
    }
  }, [config, navigate, perfil, refreshProfile, respostas, temPerfil, userKey]);

  const skip = useCallback(async () => {
    // Sem perfil o onboarding é obrigatório (o botão nem aparece)
    if (!temPerfil) return;
    setOcupado(true);
    try {
      await markSkipped(userKey, perfil);
      navigate(config.rotaHome, { replace: true });
    } finally {
      setOcupado(false);
    }
  }, [config, navigate, perfil, temPerfil, userKey]);

  return {
    respostas,
    atualizar,
    carregando,
    ocupado,
    temPerfil,
    erroEnvio,
    etapas: config.etapas,
    passo,
    totalPassos,
    passoValido,
    next,
    back,
    goTo,
    finish,
    skip,
  };
}
