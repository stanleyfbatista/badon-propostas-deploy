import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export async function mediaTests({
  base,
  editor,
  reader,
  other,
  wa,
  wb,
  cli,
  run,
}) {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  const send = async (
    user,
    workspace,
    bytes = png,
    filename = "foto.png",
    csrf = user.csrf,
  ) => {
    const form = new FormData();
    form.append("file", new Blob([bytes]), filename);
    const response = await fetch(
      `${base}/api/studio-media.php?workspace=${workspace}`,
      {
        method: "POST",
        headers: { Cookie: user.cookie || "", "X-CSRF-Token": csrf || "" },
        body: form,
      },
    );
    return { status: response.status, body: await response.json() };
  };
  const limits = await fetch(`${base}/api/studio-media.php?workspace=${wa}`, {
    headers: { Cookie: editor.cookie },
  });
  assert.equal(limits.status, 200);
  const settings = await limits.json();
  assert.ok(settings.limits.image > 0 && settings.limits.video <= 20 * 1048576);
  assert.equal((await send({}, wa)).status, 401);
  assert.equal((await send(reader, wa)).status, 403);
  assert.equal((await send(other, wa)).status, 403);
  assert.equal((await send(editor, wa, png, "foto.png", "wrong")).status, 403);
  assert.equal((await send(editor, wa, png, "exploit.php")).status, 422);
  assert.equal(
    (
      await send(
        editor,
        wa,
        Buffer.from('<svg onload="alert(1)"></svg>'),
        "foto.png",
      )
    ).status,
    422,
  );
  assert.equal(
    (await send(editor, wa, Buffer.from("<?php echo 1;"), "foto.jpg")).status,
    422,
  );
  assert.equal(
    (
      await send(
        editor,
        wa,
        Buffer.alloc(settings.limits.video + 70000),
        "large.mp4",
      )
    ).status,
    413,
  );
  const image = await send(editor, wa);
  assert.equal(image.status, 201, JSON.stringify(image.body));
  assert.match(
    image.body.media.src,
    new RegExp(`^/forms-media/uploads/${wa}/[a-f0-9]{32}\\.png$`),
  );
  assert.deepEqual(
    Buffer.from(await (await fetch(base + image.body.media.src)).arrayBuffer()),
    png,
  );
  const otherImage = await send(other, wb);
  assert.equal(otherImage.status, 201);
  const mp4 = execFileSync(
    process.env.FFMPEG_BIN || "/opt/homebrew/bin/ffmpeg",
    [
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=black:s=32x32:r=1",
      "-t",
      "1",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "frag_keyframe+empty_moov",
      "-f",
      "mp4",
      "pipe:1",
    ],
  );
  const video = await send(editor, wa, mp4, "apresentacao.mp4");
  assert.equal(video.status, 201, JSON.stringify(video.body));
  assert.equal(video.body.media.type, "video");
  assert.deepEqual(
    Buffer.from(await (await fetch(base + video.body.media.src)).arrayBuffer()),
    mp4,
  );
  const account = path.dirname(path.dirname(cli));
  run("/bin/bash", ["deploy/deploy.sh"], {
    env: { ...process.env, BADON_ACCOUNT_DIR: account },
  });
  assert.deepEqual(
    fs.readFileSync(account + "/public_html" + image.body.media.src),
    png,
    "Deploy must not remove uploaded media",
  );
  assert.deepEqual(
    fs.readFileSync(account + "/public_html" + video.body.media.src),
    mp4,
  );
  console.log(
    "OK: upload autenticado/CSRF, isolamento, formatos/tamanho, imagem/vídeo reais e mídia preservada no deploy.",
  );
  return {
    image: image.body.media,
    video: video.body.media,
    other: otherImage.body.media,
  };
}
