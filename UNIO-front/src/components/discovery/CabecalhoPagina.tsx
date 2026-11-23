interface CabecalhoPaginaProps {
  titulo: string;
  subtitulo?: string;
}

// Título das telas secundárias (Salvos, Meus unios...) e das telas do
// administrador (ADR-014)
export default function CabecalhoPagina({ titulo, subtitulo }: CabecalhoPaginaProps) {
  return (
    <div className="mb-6 border-b border-lightgray pb-5">
      {/* tabIndex -1: recebe o foco quando um item da página some (ex.: unio desfeito) */}
      <h1 tabIndex={-1} className="text-3xl font-bold text-deepgreen focus:outline-none">
        {titulo}
      </h1>
      {subtitulo && <p className="mt-2 max-w-2xl text-deepgreen/80">{subtitulo}</p>}
    </div>
  );
}
