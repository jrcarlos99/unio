import { useState, type FormEvent } from 'react';
import AuthInput from './AuthInput';
import SocialButtons from './SocialButtons';
import Button from '../ui/Button';
import { getApiErrorMessage, useAuth } from '../../contexts/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SignupFormProps {
  onSuccess: (role: string) => void;
}

// Este é só o passo 1 da conta: documento + e-mail + senha. O nome e o
// resto dos dados (segmento, ticket médio, etc.) só são pedidos depois,
// nas telas de RF01/RF02, quando a pessoa escolhe se é startup ou investidor.
export default function SignupForm({ onSuccess }: SignupFormProps) {
  const [documento, setDocumento] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState<'STARTUP' | 'INVESTOR'>('STARTUP');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [erroApi, setErroApi] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const [erros, setErros] = useState<{
    documento?: string;
    email?: string;
    senha?: string;
    acceptedTerms?: string;
  }>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const digitos = documento.replace(/\D/g, '');
    const novosErros: typeof erros = {};
    if (digitos.length !== 11 && digitos.length !== 14) {
      novosErros.documento = 'Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.';
    }
    if (!EMAIL_REGEX.test(email)) novosErros.email = 'E-mail inválido.';
    if (senha.trim() === '') novosErros.senha = 'Informe a senha.';
    else if (senha.length < 8) novosErros.senha = 'A senha deve ter no mínimo 8 caracteres.';
    if (!acceptedTerms) {
      novosErros.acceptedTerms = 'Você deve aceitar os termos de uso e política de privacidade';
    }
    setErros(novosErros);

    if (Object.keys(novosErros).length === 0) {
      setIsLoading(true);
      setErroApi('');
      register({
        email: email.trim(),
        password: senha,
        role,
        documento: digitos,
        acceptedTerms,
      })
        .then((response) => onSuccess(response.role))
        .catch((error: unknown) => setErroApi(getApiErrorMessage(error, 'Não foi possível criar a conta.')))
        .finally(() => setIsLoading(false));
    }
  }

  return (
    <div className="w-full max-w-xs text-center">
      <h1 className="mb-3 text-2xl font-bold text-deepgreen">Criar Conta</h1>

      <SocialButtons />
      <p className="mb-4 text-xs text-deepgreen">ou cadastre-se com seu e-mail</p>
      {erroApi && <p className="mb-3 text-xs text-red-600">{erroApi}</p>}

      <form onSubmit={handleSubmit} noValidate className="text-left">
        <AuthInput
          id="signup-documento"
          label="CPF ou CNPJ"
          inputMode="numeric"
          placeholder="CPF ou CNPJ"
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
        />
        {erros.documento && (
          <p className="-mt-2 mb-2 text-xs text-red-600">{erros.documento}</p>
        )}

        <AuthInput
          id="signup-email"
          label="E-mail"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {erros.email && <p className="-mt-2 mb-2 text-xs text-red-600">{erros.email}</p>}

        <AuthInput
          id="signup-senha"
          label="Senha"
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        {erros.senha && <p className="-mt-2 mb-2 text-xs text-red-600">{erros.senha}</p>}

        <label className="mb-3 flex items-start gap-2 text-xs text-deepgreen" htmlFor="signup-accepted-terms">
          <input
            id="signup-accepted-terms"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (e.target.checked) {
                setErros((current) => ({ ...current, acceptedTerms: undefined }));
              }
            }}
            className="mt-0.5 accent-deepgreen"
          />
          <span>Aceito os termos de uso e a política de privacidade.</span>
        </label>
        {erros.acceptedTerms && (
          <p className="-mt-2 mb-2 text-xs text-red-600">{erros.acceptedTerms}</p>
        )}

        <label className="mb-3 block text-xs font-semibold text-deepgreen" htmlFor="signup-role">
          Tipo de conta
          <select
            id="signup-role"
            className="mt-1 w-full rounded-lg border border-deepgreen/20 px-3 py-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as 'STARTUP' | 'INVESTOR')}
          >
            <option value="STARTUP">Startup</option>
            <option value="INVESTOR">Investidor</option>
          </select>
        </label>

        <Button type="submit" className="mt-1" disabled={isLoading}>
          {isLoading ? 'CADASTRANDO...' : 'CADASTRAR'}
        </Button>
      </form>
    </div>
  );
}
