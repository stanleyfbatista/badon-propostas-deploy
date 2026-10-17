import React, { createContext, useContext, useState } from "react";
type Request = (url: string, init?: RequestInit) => Promise<any>;
export const FlowUploadContext = createContext<Request | null>(null);
export function FlowUpload({
  workspace,
  task = 0,
  images = false,
  label = "Enviar arquivo",
  done,
}: {
  workspace: number;
  task?: number;
  images?: boolean;
  label?: string;
  done: (file: { url: string; name: string; mime: string }) => void;
}) {
  const request = useContext(FlowUploadContext),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="flow-upload">
      <label>
        {busy ? "Enviando…" : label}
        <input
          type="file"
          aria-label={label}
          disabled={busy || !workspace}
          accept={
            images
              ? "image/jpeg,image/png,image/webp"
              : "image/jpeg,image/png,image/webp,application/pdf"
          }
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || !request) return;
            if (file.size > 2 * 1048576) {
              setError("Use um arquivo de até 2 MB ou adicione um link.");
              return;
            }
            setBusy(true);
            setError("");
            try {
              const data = new FormData();
              data.set("file", file);
              data.set("workspace", String(workspace));
              if (task) data.set("task", String(task));
              const result = await request("/api/flow-file.php", {
                method: "POST",
                body: data,
                signal: AbortSignal.timeout(30000),
              });
              if (images && !result.mime.startsWith("image/"))
                throw new Error("Escolha uma imagem.");
              done(result);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <small>
        {workspace
          ? "JPG, PNG, WebP" +
            (images ? "" : " ou PDF") +
            " · até 2 MB · acesso autenticado"
          : "Salve o cadastro primeiro para enviar arquivos."}
      </small>
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
    </div>
  );
}
