import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { build } from "esbuild";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Component unit test, without launching or inspecting a browser.
const compiled = await build({
  entryPoints: ["studio/WelcomeCover.tsx"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  external: ["react"],
  loader: { ".css": "empty" },
});
const module = { exports: {} };
new Function("require", "module", "exports", compiled.outputFiles[0].text)(
  createRequire(import.meta.url),
  module,
  module.exports,
);
const { WelcomeCover, WelcomeEditor, WelcomeLayoutPicker, normalizeWelcome } =
  module.exports;
assert.equal(normalizeWelcome().enabled, true);
assert.equal(normalizeWelcome({ title: "Legado" }).enabled, true);
assert.equal(
  normalizeWelcome({ title: "Legado", enabled: false }).enabled,
  true,
);
const media = {
  type: "image",
  src: "/forms-media/uploads/1/" + "a".repeat(32) + ".png",
};
for (const layout of ["left", "right", "top", "background"])
  for (const fit of ["cover", "contain"]) {
    const welcome = normalizeWelcome({
      enabled: true,
      title: "<script>alert(1)</script>",
      message: "Bem-vindo",
      button_text: "Começar agora",
      media,
      layout,
      fit,
      x: 20,
      y: 80,
      alt: "Meu retrato",
    });
    const html = renderToStaticMarkup(
      React.createElement(WelcomeCover, { welcome, mobile: true }),
    );
    assert.ok(
      html.includes(`cover-${layout}`) && html.includes("cover-mobile"),
    );
    assert.ok(
      html.includes(`object-fit:${fit}`) &&
        html.includes("object-position:20% 80%"),
    );
    assert.ok(
      html.includes('alt="Meu retrato"') && html.includes("Começar agora"),
    );
    assert.ok(!html.includes("<script>") && html.includes("&lt;script&gt;"));
  }
const video = renderToStaticMarkup(
  React.createElement(WelcomeCover, {
    welcome: normalizeWelcome({
      title: "Vídeo",
      media: { type: "video", src: media.src.replace(".png", ".mp4") },
    }),
  }),
);
assert.ok(
  video.includes("<video") &&
    video.includes('controls=""') &&
    video.includes('playsInline=""'),
);
assert.ok(!/autoplay/i.test(video));
const empty = renderToStaticMarkup(
  React.createElement(WelcomeCover, {
    welcome: normalizeWelcome({ enabled: false }),
  }),
);
assert.ok(
  !empty.includes("Capa desativada") &&
    empty.includes("Bem-vindo!") &&
    empty.includes("cover-plain") &&
    !empty.includes("<img") &&
    !empty.includes("<video"),
);
for (const layout of ["left", "right", "top", "background"]) {
  const picker = renderToStaticMarkup(
    React.createElement(WelcomeLayoutPicker, { value: layout, onChange() {} }),
  );
  assert.equal((picker.match(/type="button"/g) || []).length, 4);
  assert.equal((picker.match(/aria-pressed="true"/g) || []).length, 1);
  assert.equal((picker.match(/<svg/g) || []).length, 4);
}
const editor = renderToStaticMarkup(
  React.createElement(WelcomeEditor, {
    value: { enabled: false, media },
    workspace: 1,
    onChange() {},
    onUpload() {},
    onUploading() {},
  }),
);
assert.ok(
  editor.includes("Capa sempre ativa") && !editor.includes('type="checkbox"'),
);
assert.ok(
  editor.includes('aria-label="À esquerda"') &&
    editor.includes('aria-label="Como fundo"'),
);
console.log(
  "OK: capa sempre ativa, quatro ícones de layout, enquadramento, celular, imagem/vídeo e escape de texto.",
);
