import { Link } from "react-router-dom";
import { Play, Star } from "lucide-react";

// Iniciais decorativas pro grupo de avatares sobrepostos — só pra sugerir
// "várias startups já usam a plataforma", sem precisar de fotos de verdade.
const AVATARES = ["EC", "MC", "AG", "PL"];

// Seção de abertura da landing page. `id="hero"` é o alvo do link "Início"
// no Header. O padding-top grande (pt-32) empurra o conteúdo pra baixo do
// header fixo, que fica sobreposto por cima dela.
export default function Hero() {
  return (
    <section
      id="hero"
      // O "leve gradiente pra um tom mais claro embaixo" usa uma cor sólida
      // (não um sage com opacidade — isso deixaria transparente e mostraria
      // o branco da página por trás, ao invés de clarear o próprio deepgreen)
      // e só aparece nos últimos 30% da seção, terminando exatamente na cor
      // que o HowItWorks começa logo abaixo — sem "emenda" visível entre as duas.
      className="bg-gradient-to-b from-deepgreen from-0% via-deepgreen via-70% to-[#1b583f] to-100% pb-20 pt-32 text-white sm:pb-28"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-8 lg:grid-cols-2">
        {/* ---------- Coluna de texto ---------- */}
        <div>
          <span className="inline-block rounded-full bg-sage px-4 py-1.5 text-sm font-semibold text-deepgreen">
            Bem-vindo(a) à UNIO
          </span>

          <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
            Onde Startups Encontram o Investimento Certo
          </h1>

          <p className="mt-5 max-w-lg text-white/80">
            Conectamos startups do ecossistema do Porto Digital a investidores
            anjo e mentores por afinidade de segmento, estágio e objetivos —
            pra cada match fazer sentido dos dois lados.
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Link
              to="/login?modo=cadastro"
              className="rounded-full bg-sage px-8 py-3 font-semibold text-deepgreen transition-colors hover:bg-white"
            >
              Comece Agora
            </Link>

            {/* Só decorativo por enquanto — não tem vídeo pra tocar ainda */}
            <button
              type="button"
              aria-label="Assistir vídeo de apresentação (em breve)"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/40 transition-colors hover:bg-white/10"
            >
              <Play size={18} className="ml-0.5 fill-white" />
            </button>
          </div>

          {/* ---------- Prova social ---------- */}
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-2">
              <div className="flex text-sage">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={16} className="fill-sage" />
                ))}
              </div>
              <span className="text-sm text-white/80">4,5 (500+ avaliações)</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {AVATARES.map((iniciais) => (
                  <span
                    key={iniciais}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-deepgreen bg-sage text-xs font-bold text-deepgreen"
                  >
                    {iniciais}
                  </span>
                ))}
              </div>
              <span className="text-sm text-white/80">Startups já cadastradas</span>
            </div>
          </div>
        </div>

        {/* ---------- Coluna visual: card de "perfil compatível" ---------- */}
        <div className="relative mx-auto mt-8 w-full max-w-sm">
          <div className="rounded-3xl bg-white p-6 text-deepgreen shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-deepgreen/60">
              Sugestão de match
            </p>

            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-deepgreen text-sm font-bold text-white">
                EC
              </span>
              <div>
                <p className="font-semibold">EcoTech Solutions</p>
                <p className="text-sm text-deepgreen/60">AgTech · Estágio MVP</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Compatibilidade</span>
                <span>92%</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-lightgray">
                <div className="h-2 w-[92%] rounded-full bg-sage" />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-lightgray px-3 py-1 text-xs font-medium text-deepgreen">
                Investimento
              </span>
              <span className="rounded-full bg-lightgray px-3 py-1 text-xs font-medium text-deepgreen">
                Mentoria
              </span>
            </div>
          </div>

          {/* Badge flutuante no canto de cima — fica sobre uma área vazia do
              card (o topo, ao lado de "Sugestão de match"), longe das tags
              lá embaixo, pra não sobrepor nenhum conteúdo do card */}
          <div className="absolute -top-6 -right-4 rounded-2xl bg-white px-5 py-3 text-deepgreen shadow-xl">
            <p className="text-lg font-bold leading-none">150+</p>
            <p className="text-xs text-deepgreen/70">Startups Conectadas</p>
          </div>
        </div>
      </div>
    </section>
  );
}
