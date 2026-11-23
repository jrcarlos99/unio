import GradeCalendario, { type GradeCalendarioProps } from "./GradeCalendario";

type CalendarioDiaProps = Omit<GradeCalendarioProps, "dias" | "onSelecionarDia"> & { dia: string };

// Visão Dia: uma coluna só (padrão no mobile). Setas mudam o dia.
export default function CalendarioDia({ dia, ...props }: CalendarioDiaProps) {
  return <GradeCalendario {...props} dias={[dia]} />;
}
