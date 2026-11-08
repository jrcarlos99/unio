import { useState } from "react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import InfoPanel from "./InfoPanel";
import MobileInfoBanner from "./MobileInfoBanner";

type Mode = "login" | "signup";

interface AuthCardProps {
  onLoginSuccess: (role: string) => void;
  onSignupSuccess: (role: string) => void;
  modoInicial?: Mode;
}

export default function AuthCard({
  onLoginSuccess,
  onSignupSuccess,
  modoInicial = "login",
}: AuthCardProps) {
  const [mode, setMode] = useState<Mode>(modoInicial);
  const isSignup = mode === "signup";

  function toggleMode() {
    setMode((current) => (current === "login" ? "signup" : "login"));
  }

  // Classes em comum dos dois formulários (o que muda é a posição/opacidade)
  const panelBase =
    "absolute inset-y-0 left-0 flex w-1/2 items-center justify-center bg-white px-6 transition-all duration-[600ms] ease-in-out";

  return (
    <>
      {/* ---------- Versão desktop: cartão com slide horizontal ---------- */}
      <div className="relative hidden h-[600px] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl md:block">
        {/* Formulário de login: visível e "encaixado" à esquerda no modo login;
            some para a direita (translate-x-full) e fica invisível no modo cadastro */}
        <div
          className={`${panelBase} ${
            isSignup
              ? "z-10 translate-x-full opacity-0 pointer-events-none"
              : "z-20 translate-x-0 opacity-100"
          }`}
        >
          <LoginForm onSuccess={onLoginSuccess} />
        </div>

        {/* Formulário de cadastro: começa escondido (mesma posição do login,
            porém invisível) e desliza junto para a direita quando ativo */}
        <div
          className={`${panelBase} ${
            isSignup
              ? "z-20 translate-x-full opacity-100"
              : "z-10 translate-x-0 opacity-0 pointer-events-none"
          }`}
        >
          <SignupForm onSuccess={onSignupSuccess} />
        </div>

        {/* Painel colorido: ocupa a metade direita por padrão (modo login) e
            desliza -100% (sua própria largura) para a metade esquerda quando
            o modo é cadastro, cobrindo o formulário de login */}
        <div
          className={`absolute inset-y-0 left-1/2 z-30 w-1/2 overflow-hidden transition-transform duration-[600ms] ease-in-out ${
            isSignup ? "-translate-x-full" : "translate-x-0"
          }`}
        >
          <InfoPanel mode={mode} onSwitch={toggleMode} />
        </div>
      </div>

      {/* ---------- Versão mobile: cartão empilhado, sem slide ---------- */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl md:hidden">
        <MobileInfoBanner mode={mode} onSwitch={toggleMode} />
        <div className="flex justify-center px-6 py-8">
          {isSignup ? (
            <SignupForm onSuccess={onSignupSuccess} />
          ) : (
            <LoginForm onSuccess={onLoginSuccess} />
          )}
        </div>
      </div>
    </>
  );
}
