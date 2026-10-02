import React from "react";

export function RememberChoice({ available }: { available: boolean }) {
  return (
    <div className="remember-choice">
      <label>
        <input
          type="checkbox"
          name="remember"
          disabled={!available}
          aria-describedby="remember-help"
        />{" "}
        Permanecer conectado
      </label>
      <small id="remember-help">
        {available
          ? "Por até 30 dias neste navegador. Use somente em um dispositivo pessoal."
          : "Para ativar esta opção, é necessário atualizar o acesso com auth:migrate no cPanel."}
      </small>
    </div>
  );
}
