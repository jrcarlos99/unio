import { CalendarCheck, CircleAlert, Eye, Lock, TrendingDown, TrendingUp, UserCheck } from "lucide-react";
import { usePopularidade } from "../../hooks/useAvaliacoes";
import type { SessaoReunioes } from "../../services/reunioesService";
import MetricCard from "../dashboard/MetricCard";
import ViewsChart from "../dashboard/ViewsChart";
import AvisoEstado from "../discovery/AvisoEstado";
import CardPopularidade from "./CardPopularidade";

const SELO = "inline-flex items-center gap-1 rounded-full bg-sage/30 px-2 py-0.5 font-semibold text-deepgreen";

// Aba "Popularidade" do Meu perfil (investidor): mini dashboard SOMENTE
// LEITURA. Só números e porcentagens: nada de nomes, notas individuais,
// comentários ou lista de pessoas. Não tem campo editável, então não entra no
// aviso de "alterações não salvas".
export default function AbaPopularidade({ sessao }: { sessao: SessaoReunioes }) {
  const popularidade = usePopularidade(sessao);
  const { dados, carregando, erro } = popularidade;

  if (erro) {
    return (
      <AvisoEstado
        erro
        icone={CircleAlert}
        titulo="Não foi possível carregar a popularidade"
        texto="Tente novamente em alguns instantes."
      />
    );
  }

  const visitas = dados?.visitas;
  const variacao = visitas?.variacaoPercentual ?? 0;
  const IconeVariacao = variacao < 0 ? TrendingDown : TrendingUp;
  const mediaDiaria = visitas ? visitas.total28d / 28 : 0;

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-2xl bg-lightgray/60 px-4 py-3 text-sm">
        <Lock size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        Só você vê estes números. Ninguém vê quem visitou ou quem avaliou.
      </p>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <CardPopularidade
          {...popularidade}
          apoio="Média das notas que você recebeu depois de reuniões, em porcentagem."
        />
        <MetricCard
          rotulo="Visitas no perfil"
          valor={carregando || !visitas ? "..." : visitas.total28d}
          icone={Eye}
          rodape={
            <>
              <span className={SELO}>
                <IconeVariacao size={12} aria-hidden="true" />
                {variacao > 0 ? "+" : ""}
                {variacao}%
              </span>
              nos últimos 28 dias, vs 28 dias anteriores
            </>
          }
        />
        <MetricCard
          rotulo="Reuniões realizadas"
          valor={carregando || !dados ? "..." : dados.reunioesRealizadas}
          icone={CalendarCheck}
          rodape="com presença confirmada"
        />
        <MetricCard
          rotulo="Interesses recebidos"
          valor={carregando || !dados ? "..." : dados.interessesRecebidos}
          icone={UserCheck}
          rodape="startups que demonstraram interesse"
        />
      </div>

      {visitas && visitas.semanal.length > 0 && (
        <ViewsChart semanas={visitas.semanal} mediaDiaria={mediaDiaria} titulo="Visitas no perfil" unidade="visitas" />
      )}
    </div>
  );
}
