import { useState, type FormEvent } from "react";
import AuthInput from "./AuthInput";
import SocialButtons from "./SocialButtons";
import Button from "../ui/Button";
import { getApiErrorMessage, useAuth } from "../../contexts/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginFormProps {
  onSuccess: (role: string) => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erros, setErros] = useState<{ email?: string; senha?: string }>({});
  const [erroApi, setErroApi] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const novosErros: typeof erros = {};
    if (!EMAIL_REGEX.test(email)) {
      novosErros.email = "E-mail inválido.";
    }

    // A conta admin é fixa (sem back-end ainda), então a senha dela é
    // realmente conferida. Para as demais contas, qualquer senha preenchida
    // é aceita, como já combinado no resto do fluxo de login/cadastro.
    if (senha.trim() === "") {
      novosErros.senha = "Informe a senha.";
    }

    setErros(novosErros);

    if (Object.keys(novosErros).length === 0) {
      setIsLoading(true);
      setErroApi("");
      login(email.trim(), senha)
        .then((profile) => onSuccess(profile.role))
        .catch((error: unknown) =>
          setErroApi(getApiErrorMessage(error, "Não foi possível entrar. Verifique suas credenciais.")),
        )
        .finally(() => setIsLoading(false));
    }
  }

  return (
    <div className="w-full max-w-xs text-center">
      <h1 className="mb-3 text-2xl font-bold text-deepgreen">Entrar</h1>

      <SocialButtons />
      <p className="mb-4 text-xs text-deepgreen">ou entre com e-mail e senha</p>
      {erroApi && <p className="mb-3 text-xs text-red-600">{erroApi}</p>}

      <form onSubmit={handleSubmit} noValidate className="text-left">
        <AuthInput
          id="login-email"
          label="E-mail"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {erros.email && (
          <p className="-mt-2 mb-2 text-xs text-red-600">{erros.email}</p>
        )}

        <AuthInput
          id="login-senha"
          label="Senha"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        {erros.senha && (
          <p className="-mt-2 mb-2 text-xs text-red-600">{erros.senha}</p>
        )}

        {/* Sem link morto: o fluxo de recuperação (forgot e reset-password do
            back) ainda não tem tela (ADR-007) */}
        <p className="mb-4 text-right text-xs text-deepgreen/75" aria-disabled="true">
          Recuperação de senha em breve
        </p>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "ENTRANDO..." : "ENTRAR"}
        </Button>
      </form>
    </div>
  );
}
