import type { Contato } from "../types/contato";

// Validação de contatos e montagem dos links externos (WhatsApp, e-mail,
// telefone). Nunca renderizar um link a partir de texto
// digitado sem passar por aqui: os links só usam números/e-mails validados e
// tudo que vai na URL passa por encodeURIComponent.

export function somenteDigitos(texto: string) {
  return texto.replace(/\D/g, "");
}

// Telefone brasileiro → só dígitos com DDI 55, ou null se inválido.
// Aceita DDD + número (10 ou 11 dígitos) com ou sem o 55 na frente.
export function normalizarTelefone(texto: string | undefined | null): string | null {
  if (!texto) return null;
  let digitos = somenteDigitos(texto);
  if (digitos.length === 12 || digitos.length === 13) {
    if (!digitos.startsWith("55")) return null;
    digitos = digitos.slice(2);
  }
  if (digitos.length !== 10 && digitos.length !== 11) return null;
  // DDD de 11 a 99; celular (11 dígitos) começa com 9
  if (Number(digitos.slice(0, 2)) < 11) return null;
  if (digitos.length === 11 && digitos[2] !== "9") return null;
  return `55${digitos}`;
}

// "5581999990000" → "(81) 99999-0000"
export function formatarTelefone(texto: string) {
  const digitos = somenteDigitos(texto).replace(/^55(?=\d{10,11}$)/, "");
  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return texto;
}

// Máscara enquanto digita: "(81) 9999" ...
export function mascararTelefone(texto: string) {
  const d = somenteDigitos(texto).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const FORMATO_EMAIL = /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}$/i;

// E-mail válido → minúsculo e sem espaços, ou null
export function validarEmail(texto: string | undefined | null): string | null {
  const email = texto?.trim().toLowerCase() ?? "";
  if (!email || email.length > 254 || !FORMATO_EMAIL.test(email)) return null;
  return email;
}

// Só os canais válidos de um contato (o resto é descartado)
export function contatoValido(contato: Contato | null | undefined): Contato {
  const whatsapp = normalizarTelefone(contato?.whatsapp);
  const telefone = normalizarTelefone(contato?.telefone);
  const email = validarEmail(contato?.email);
  return {
    ...(whatsapp ? { whatsapp } : {}),
    ...(email ? { email } : {}),
    ...(telefone ? { telefone } : {}),
  };
}

export function temAlgumContato(contato: Contato) {
  return Boolean(contato.whatsapp || contato.email || contato.telefone);
}

export function linkWhatsApp(numero: string, mensagem: string): string | null {
  const valido = normalizarTelefone(numero);
  return valido ? `https://wa.me/${valido}?text=${encodeURIComponent(mensagem)}` : null;
}

export function linkEmail(email: string, assunto: string, corpo: string): string | null {
  const valido = validarEmail(email);
  if (!valido) return null;
  return `mailto:${valido}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
}

export function linkTelefone(numero: string): string | null {
  const valido = normalizarTelefone(numero);
  return valido ? `tel:+${valido}` : null;
}
