export type LoginFieldError = { field: "email" | "password"; message: string };

export function validateLoginFields(
  mode: "login" | "magic",
  email: string,
  password = "",
): LoginFieldError | null {
  const normalized = email.trim();
  if (!normalized)
    return { field: "email", message: "Informe seu e-mail para continuar." };
  if (
    normalized.length > 190 ||
    !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(normalized)
  )
    return {
      field: "email",
      message: "Informe um e-mail válido, como nome@empresa.com.",
    };
  if (mode === "login" && !password)
    return {
      field: "password",
      message: "Informe sua senha ou escolha receber um link por e-mail.",
    };
  return null;
}
