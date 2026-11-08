import GradeCalendario, { type GradeCalendarioProps } from "./GradeCalendario";

// Visão Semana: segunda a domingo da semana do dia em foco
export default function CalendarioSemana(props: GradeCalendarioProps) {
  return <GradeCalendario {...props} />;
}
