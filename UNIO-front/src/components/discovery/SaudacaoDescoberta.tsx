interface CartaoResumo {
  rotulo: string;
  valor: string;
}

interface SaudacaoDescobertaProps {
  nome: string;
  carregando: boolean;
  // "12 startups novas combinam com o seu perfil"
  resumo: string;
  // Texto depois de "Critérios:"
  criterios: string;
  // Até dois números à direita (o primeiro com fundo destacado). O segundo é
  // opcional e some quando o dado não existe no back (ADR-008)
  cartoes: [CartaoResumo, CartaoResumo?];
}

// "Olá, {nome}" + resumo da lista + critérios, e o card com dois números à
// direita (Descobrir: ticket/tesouraria; Investidores: capital/captação)
export default function SaudacaoDescoberta({ nome, carregando, resumo, criterios, cartoes }: SaudacaoDescobertaProps) {
  const [destaque, segundo] = cartoes;
  return (
    <div className="mt-8 flex flex-col gap-6 border-b border-lightgray pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold text-deepgreen sm:text-4xl">{nome ? `Olá, ${nome}` : "Olá!"}</h1>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
          {carregando ? (
            <span className="h-4 w-64 animate-pulse rounded bg-lightgray" aria-hidden="true" />
          ) : (
            <>
              <p className="text-deepgreen/80">{resumo}</p>
              <p className="flex items-start gap-2 text-sm font-semibold text-deepgreen">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" aria-hidden="true" />
                Critérios: {criterios}
              </p>
            </>
          )}
        </div>
      </div>

      <dl
        className={`grid shrink-0 gap-3 rounded-3xl border border-lightgray bg-white p-3 shadow-soft ${
          segundo ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        <div className="rounded-2xl bg-lightgray/60 px-4 py-3">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-deepgreen/75">{destaque.rotulo}</dt>
          <dd className="mt-1 text-lg font-bold text-deepgreen">{carregando ? "…" : destaque.valor}</dd>
        </div>
        {segundo && (
          <div className="px-4 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-deepgreen/75">{segundo.rotulo}</dt>
            <dd className="mt-1 text-lg font-bold text-deepgreen">{carregando ? "…" : segundo.valor}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
