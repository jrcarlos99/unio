import type { ProfileStatus } from "../../../types/visibility";
import { CHIP } from "../../pitch/styles";

export default function ProfileStatusBadge({ status }: { status: ProfileStatus }) {
  const active = status === "active";
  return (
    <span className={`${CHIP} ${active ? "bg-sage/30" : "bg-lightgray"} text-deepgreen`}>
      <span className={`h-2 w-2 rounded-full ${active ? "bg-deepgreen" : "bg-deepgreen/60"}`} aria-hidden="true" />
      {active ? "Visível para investidores" : "Perfil pausado"}
    </span>
  );
}