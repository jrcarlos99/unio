import type { Ref } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, MapPin } from "lucide-react";
import type { Recomendacao } from "../../types/recomendacoes";
import { formatarFaixaTicket } from "../../utils/formatoDescoberta";
import { localDaStartup, localDoInvestidor, textoCapital, textoDisponibilidade } from "../../utils/perfilDescoberta";
import AvatarIniciais from "../discovery/AvatarIniciais";
import MatchRing from "../discovery/MatchRing";
import StartupLogo from "../discovery/StartupLogo";
import { rotuloTipoInvestidor } from "../discovery/rotulos";
import { FOCO_VISIVEL } from "../onboarding/selecao";

interface UnioMiniPerfilProps {
  rec: Recomendacao;
  idTitulo: string;
  // O modal coloca o foco inicial no título
  refTitulo: Ref<HTMLHeadingElement>;
}

interface Fato {
  rotulo: string;
  valor: string;
}

// Resumo da outra parte no popup do unio: startup (para o investidor) ou
// investidor (para a startup)
export default function UnioMiniPerfil({ rec, idTitulo, refTitulo }: UnioMiniPerfilProps) {
  let avatar;
  let nome;
  let verificado;
  let chips: string[];
  let descricao;
  let fatos: Fato[];
  let href;
  let cidade;

  if (rec.perfil === "investidor") {
    const { startup } = rec.item;
    avatar = <StartupLogo startup={startup} />;
    nome = startup.nome;
    verificado = startup.verificada;
    chips = [startup.segmento, startup.estagio];
    cidade = localDaStartup(startup);
    descricao = startup.descricao;
    fatos = [
      { rotulo: "Capital procurado", valor: textoCapital(startup) },
      { rotulo: "Estágio", valor: startup.estagio },
      { rotulo: "Mercado-alvo", valor: startup.mercadoAlvo },
      ...(startup.metrica ? [{ rotulo: startup.metrica.rotulo, valor: startup.metrica.valor }] : []),
    ];
    href = `/startups/${startup.id}`;
  } else {
    const { investidor } = rec.item;
    const temTicket = investidor.ticketMin !== null && investidor.ticketMax !== null;
    avatar = <AvatarIniciais nome={investidor.nome} />;
    nome = investidor.nome;
    verificado = investidor.verificado;
    chips = [rotuloTipoInvestidor(investidor.tipo)];
    cidade = localDoInvestidor(investidor);
    descricao = investidor.tese;
    fatos = [
      {
        rotulo: "Ticket",
        valor: temTicket
          ? formatarFaixaTicket(investidor.ticketMin as number, investidor.ticketMax as number, " a ")
          : "Só mentoria",
      },
      { rotulo: "Segmentos de interesse", valor: investidor.segmentosInteresse.join(", ") },
      { rotulo: "Estágios preferidos", valor: investidor.estagiosInteresse.join(", ") },
      { rotulo: "Disponibilidade", valor: textoDisponibilidade(investidor.disponibilidade) },
    ];
    href = `/investidores/${investidor.id}`;
  }

  return (
    <div>
      <div className="flex items-start gap-4">
        {avatar}
        <div className="min-w-0 flex-1">
          <h2
            id={idTitulo}
            ref={refTitulo}
            tabIndex={-1}
            className="text-2xl font-bold leading-tight text-deepgreen focus:outline-none"
          >
            {nome}
            {verificado && (
              <BadgeCheck size={18} className="ml-1.5 inline align-[-2px]" role="img" aria-label="Verificado" />
            )}
          </h2>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Resumo">
            {chips.filter(Boolean).map((chip) => (
              <li key={chip} className="rounded-full bg-lightgray px-2.5 py-0.5 text-xs font-medium text-deepgreen">
                {chip}
              </li>
            ))}
            <li className="inline-flex items-center gap-1 rounded-full bg-lightgray px-2.5 py-0.5 text-xs font-medium text-deepgreen">
              <MapPin size={12} aria-hidden="true" />
              {cidade}
            </li>
          </ul>
        </div>
        <MatchRing valor={rec.item.compatibilidade.total} />
      </div>

      {descricao && <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-deepgreen/80">{descricao}</p>}

      <dl className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {fatos.filter((fato) => fato.valor).map((fato) => (
          <div key={fato.rotulo} className="rounded-2xl bg-lightgray/40 px-4 py-3">
            <dt className="text-xs text-deepgreen/75">{fato.rotulo}</dt>
            <dd className="mt-0.5 text-sm font-bold text-deepgreen">{fato.valor}</dd>
          </div>
        ))}
      </dl>

      <Link
        to={href}
        className={`mt-3 inline-flex items-center gap-1 rounded text-sm font-semibold text-deepgreen hover:underline ${FOCO_VISIVEL}`}
      >
        Ver perfil completo
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}
