import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleAlert, MessageSquare } from "lucide-react";
import AvatarIniciais from "../../components/discovery/AvatarIniciais";
import AvisoEstado from "../../components/discovery/AvisoEstado";
import CabecalhoPagina from "../../components/discovery/CabecalhoPagina";
import LinhaUnio, { idLinhaUnio } from "../../components/discovery/LinhaUnio";
import StartupLogo from "../../components/discovery/StartupLogo";
import { rotuloTipoInvestidor } from "../../components/discovery/rotulos";
import { FOCO_VISIVEL } from "../../components/onboarding/selecao";
import UnioModal from "../../components/unios/UnioModal";
import { useAuth } from "../../contexts/AuthContext";
import { useCarregamento } from "../../hooks/useDescoberta";
import { idDaRecomendacao, listarUnios } from "../../services/recomendacoesService";
import type { PerfilApp, Recomendacao } from "../../types/recomendacoes";

const BOTAO = `inline-flex min-h-[48px] items-center rounded-2xl border border-lightgray bg-white px-5 text-sm font-semibold text-deepgreen hover:border-sage ${FOCO_VISIVEL}`;

const TEXTOS: Record<
  PerfilApp,
  { subtitulo: string; vazioTitulo: string; vazioTexto: string; link: { para: string; rotulo: string } }
> = {
  investidor: {
    subtitulo: "Startups com quem você deu match. Clique em um unio para ver o resumo e entrar em contato.",
    vazioTitulo: "Nenhum match ainda",
    vazioTexto:
      "Quando uma startup em que você demonstrou interesse também se interessar por você, ela aparece aqui.",
    link: { para: "/home-investidor", rotulo: "Descobrir startups" },
  },
  startup: {
    subtitulo: "Investidores com quem você deu match. Clique em um unio para ver o resumo e entrar em contato.",
    vazioTitulo: "Você ainda não tem unios",
    vazioTexto: "Demonstre interesse em investidores para dar match.",
    link: { para: "/investidores", rotulo: "Ver investidores" },
  },
};

function Linha({ rec, onAbrir }: { rec: Recomendacao; onAbrir: () => void }) {
  if (rec.perfil === "investidor") {
    const { startup, compatibilidade } = rec.item;
    return (
      <LinhaUnio
        id={startup.id}
        nome={startup.nome}
        avatar={<StartupLogo startup={startup} />}
        subtitulo={`${startup.segmento} • ${startup.cidade}, ${startup.uf}`}
        match={compatibilidade.total}
        onAbrir={onAbrir}
      />
    );
  }
  const { investidor, compatibilidade } = rec.item;
  return (
    <LinhaUnio
      id={investidor.id}
      nome={investidor.nome}
      avatar={<AvatarIniciais nome={investidor.nome} />}
      subtitulo={`${rotuloTipoInvestidor(investidor.tipo)} • ${investidor.cidade}, ${investidor.uf}`}
      match={compatibilidade.total}
      onAbrir={onAbrir}
    />
  );
}

// Devolve o foco à linha do unio (ou ao título, se a linha saiu da lista)
function devolverFoco(id: string) {
  requestAnimationFrame(() => {
    (document.getElementById(idLinhaUnio(id)) ?? document.querySelector<HTMLElement>("main h1"))?.focus();
  });
}

// "Meus unios" dos dois perfis: quem deu match (os dois lados demonstraram
// interesse). Clicar num unio abre o popup com o resumo e os atalhos de
// contato/reunião. ?unio=<id> abre o popup direto (deep link).
export default function PaginaMeusUnios({ perfil }: { perfil: PerfilApp }) {
  const { user } = useAuth();
  const textos = TEXTOS[perfil];
  const [params, setParams] = useSearchParams();
  const idAberto = params.get("unio");

  const carregar = useCallback(() => listarUnios(perfil, user), [perfil, user]);
  const { carregando, erro, dados, recarregar, alterarDados } = useCarregamento(
    carregar,
    "Não foi possível carregar seus unios.",
  );

  // O popup só abre para um unio que está na lista (match de verdade)
  const aberto = dados?.find((rec) => idDaRecomendacao(rec) === idAberto) ?? null;

  const abrir = (id: string) => setParams({ unio: id });
  const fechar = () => {
    if (idAberto) devolverFoco(idAberto);
    setParams({}, { replace: true });
  };
  const aoDesfazer = (rec: Recomendacao) => {
    const id = idDaRecomendacao(rec);
    alterarDados((lista) => lista.filter((item) => idDaRecomendacao(item) !== id));
    setParams({}, { replace: true });
    devolverFoco(id);
  };

  return (
    <div>
      <CabecalhoPagina titulo="Meus unios" subtitulo={textos.subtitulo} />

      {carregando ? (
        <div className="grid grid-cols-1 gap-3 min-[1700px]:grid-cols-2" aria-busy="true">
          <span className="sr-only">Carregando unios</span>
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-3xl bg-lightgray" />
          ))}
        </div>
      ) : erro ? (
        <AvisoEstado
          erro
          icone={CircleAlert}
          titulo="Não foi possível carregar seus unios"
          texto={erro}
          acao={
            <button type="button" onClick={recarregar} className={BOTAO}>
              Tentar novamente
            </button>
          }
        />
      ) : !dados || dados.length === 0 ? (
        <AvisoEstado
          icone={MessageSquare}
          titulo={textos.vazioTitulo}
          texto={textos.vazioTexto}
          acao={
            <Link to={textos.link.para} className={BOTAO}>
              {textos.link.rotulo}
            </Link>
          }
        />
      ) : (
        // Linhas em 2 colunas a partir de 1700px (mesmo ponto da 4ª coluna dos
        // cards em GRADE_CARDS), para não esticar no AppLayout fluido
        <ul className="grid grid-cols-1 gap-3 min-[1700px]:grid-cols-2">
          {dados.map((rec) => {
            const id = idDaRecomendacao(rec);
            return <Linha key={id} rec={rec} onAbrir={() => abrir(id)} />;
          })}
        </ul>
      )}

      {aberto && <UnioModal key={idAberto} rec={aberto} onFechar={fechar} onDesfeito={aoDesfazer} />}
    </div>
  );
}
