import React from "react";
export function MetaPixelSettings({
  value,
  onChange,
}: {
  value?: { enabled: boolean; id: string };
  onChange: (value: { enabled: boolean; id: string }) => void;
}) {
  const pixel = value || { enabled: false, id: "" };
  return (
    <>
      <h2>Pixel da Meta</h2>
      <p className="muted">
        Facebook e Instagram · um Pixel por formulário. Não é necessário
        informar sua senha ou token da Meta.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={pixel.enabled}
          onChange={(e) => onChange({ ...pixel, enabled: e.target.checked })}
        />{" "}
        Ativar Pixel neste formulário
      </label>
      <label className="control">
        <span>ID do Pixel / conjunto de dados</span>
        <input
          inputMode="numeric"
          maxLength={25}
          placeholder="Somente números"
          value={pixel.id}
          onChange={(e) => onChange({ ...pixel, id: e.target.value.trim() })}
        />
      </label>
      <p>
        O evento <strong>Lead</strong> conta todos os envios confirmados,
        inclusive encerramentos condicionais. Não dispara apenas por clicar em
        Enviar.
      </p>
      <ul>
        <li>PageView: abriu o formulário.</li>
        <li>BadonFormStart: clicou em Começar.</li>
        <li>BadonFormStep: chegou a uma pergunta (número da etapa).</li>
        <li>BadonFormReview: chegou à confirmação final.</li>
        <li>Lead: resposta salva com sucesso.</li>
      </ul>
      <p className="muted">
        Os eventos identificam o formulário e a etapa, sem incluir respostas,
        títulos de perguntas, nome, e-mail ou telefone nos parâmetros. O Pixel
        recebe dados técnicos, como endereço da página, IP e identificadores de
        publicidade.
      </p>
      <p className="muted">
        O visitante escolhe aceitar ou recusar a medição. A recusa não impede o
        preenchimento. Bloqueadores e recusas reduzem os números medidos; não
        representam todas as visitas.
      </p>
      <p className="muted">
        Salve e publique para aplicar. Confira em “Testar eventos”, no
        Gerenciador de Eventos da Meta. O ID não concede acesso à conta de
        anúncios; permissões e conversões de campanha são configuradas na Meta.
        Não há painel interno de abandono nesta etapa.
      </p>
    </>
  );
}
