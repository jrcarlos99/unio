interface EsqueletoBlocosProps {
  // Lido por leitores de tela enquanto carrega (ex.: "Carregando cadastros").
  // Sem rótulo quando outro bloco da mesma tela já anuncia o carregamento.
  rotulo?: string;
  quantidade: number;
  // Altura de cada bloco (classe do Tailwind, ex.: "h-16")
  altura: string;
  // Grid ou pilha dos blocos (padrão: pilha)
  className?: string;
}

// Carregamento no mesmo padrão da Visão geral da startup: blocos cinza com
// pulso, no formato do conteúdo que vai chegar
export default function EsqueletoBlocos({ rotulo, quantidade, altura, className = "space-y-3" }: EsqueletoBlocosProps) {
  return (
    <div aria-busy="true" className={className}>
      {rotulo && <span className="sr-only">{rotulo}</span>}
      {Array.from({ length: quantidade }, (_, i) => (
        <div key={i} className={`${altura} animate-pulse rounded-3xl bg-lightgray`} />
      ))}
    </div>
  );
}
