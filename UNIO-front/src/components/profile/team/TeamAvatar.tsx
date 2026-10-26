import { avatarTone } from "../../../utils/team";
import { iniciais } from "../../../utils/nomeUsuario";

export default function TeamAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold ${avatarTone(name)}`}
    >
      {iniciais(name)}
    </span>
  );
}
