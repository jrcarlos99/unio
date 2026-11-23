import { useCallback } from "react";
import { Link } from "react-router-dom";
import { Bookmark, CircleAlert } from "lucide-react";
import AvisoEstado from "../../components/discovery/AvisoEstado";
import CabecalhoPagina from "../../components/discovery/CabecalhoPagina";
import CardRecomendacao from "../../components/discovery/CardRecomendacao";
import { GRADE_CARDS } from "../../components/discovery/GradeRecomendacoes";
import StartupCardSkeleton from "../../components/discovery/StartupCardSkeleton";
import { FOCO_VISIVEL } from "../../components/onboarding/selecao";
import { useAuth } from "../../contexts/AuthContext";
import { useCarregamento } from "../../hooks/useDescoberta";
import { useAcoesRecomendacao } from "../../hooks/useRecomendacoes";
import { comAlteracao, idDaRecomendacao, listarSalvos } from "../../services/recomendacoesService";
import type { AlteracaoRecomendacao, PerfilApp } from "../../types/recomendacoes";

const BOTAO = `inline-flex min-h-[48px] items-center rounded-2xl border border-lightgray bg-white px-5 text-sm font-semibold text-deepgreen hover:border-sage ${FOCO_VISIVEL}`;

const TEXTOS: Record<
  PerfilApp,
  { subtitulo: string; vazioTitulo: string; vazioTexto: string; link: { para: string; rotulo: string } }
> = {
  investidor: {
    subtitulo: "Startups que você guardou para analisar depois. Salvar não avisa a startup.",
    vazioTitulo: "Nenhuma startup salva",
    vazioTexto: "Use o ícone de salvar nos cards para guardar startups e voltar a elas depois.",
    link: { para: "/home-investidor", rotulo: "Descobrir startups" },
  },
  startup: {
    subtitulo: "Investidores que você guardou para analisar depois. Salvar não avisa o investidor.",
    vazioTitulo: "Nenhum investidor salvo ainda",
    vazioTexto: "Toque no marcador de um card para guardar aqui.",
    link: { para: "/investidores", rotulo: "Ver investidores" },
  },
};

// "Salvos" dos dois perfis: startups (investidor) ou investidores (startup)
export default function PaginaSalvos({ perfil }: { perfil: PerfilApp }) {
  const { user } = useAuth();
  const textos = TEXTOS[perfil];
  const carregar = useCallback(() => listarSalvos(perfil, user), [perfil, user]);
  const { carregando, erro, dados, recarregar, alterarDados } = useCarregamento(
    carregar,
    "Não foi possível carregar seus salvos.",
  );

  // Tirou dos salvos aqui: some da lista
  const aoAlterar = useCallback(
    (id: string, alteracao: AlteracaoRecomendacao) =>
      alterarDados((lista) =>
        alteracao.salvo === false
          ? lista.filter((rec) => idDaRecomendacao(rec) !== id)
          : lista.map((rec) => (idDaRecomendacao(rec) === id ? comAlteracao(rec, alteracao) : rec)),
      ),
    [alterarDados],
  );
  const { alternarSalvo, demonstrarInteresse, desfazer, estaOcupado } = useAcoesRecomendacao(aoAlterar);

  return (
    <div>
      <CabecalhoPagina titulo="Salvos" subtitulo={textos.subtitulo} />

      {carregando ? (
        <div className={GRADE_CARDS} aria-busy="true">
          <span className="sr-only">Carregando salvos</span>
          {Array.from({ length: 3 }, (_, i) => (
            <StartupCardSkeleton key={i} />
          ))}
        </div>
      ) : erro ? (
        <AvisoEstado
          erro
          icone={CircleAlert}
          titulo="Não foi possível carregar seus salvos"
          texto={erro}
          acao={
            <button type="button" onClick={recarregar} className={BOTAO}>
              Tentar novamente
            </button>
          }
        />
      ) : !dados || dados.length === 0 ? (
        <AvisoEstado
          icone={Bookmark}
          titulo={textos.vazioTitulo}
          texto={textos.vazioTexto}
          acao={
            <Link to={textos.link.para} className={BOTAO}>
              {textos.link.rotulo}
            </Link>
          }
        />
      ) : (
        <ul className={GRADE_CARDS}>
          {dados.map((rec) => {
            const id = idDaRecomendacao(rec);
            return (
              <li key={id}>
                <CardRecomendacao
                  rec={rec}
                  ocupado={estaOcupado(id)}
                  onSalvar={() => alternarSalvo(rec)}
                  onInteresse={() => demonstrarInteresse(rec)}
                  onDesfazer={() => desfazer(rec)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
