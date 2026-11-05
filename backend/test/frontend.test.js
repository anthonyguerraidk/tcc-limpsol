import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const root = new URL("../../frontend/", import.meta.url);

test("cliente usa /api, envia chave no header e rejeita erros HTTP", async () => {
  const source = await readFile(new URL("js/api.js", root), "utf8");
  let request;
  const context = vm.createContext({
    window: { LIMPSOL_CONFIG: { apiBaseUrl: "https://api.example.com/api/" } },
    AbortSignal,
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ ok: true }) };
    }
  });
  vm.runInContext(source, context);
  await vm.runInContext('accessKey = "private-key"; apiRequest("/settings/update/autoClean", { method: "POST", body: JSON.stringify({ autoClean: true }) })', context);
  assert.equal(request.url, "https://api.example.com/api/settings/update/autoClean");
  assert.equal(request.options.headers.Authorization, "Bearer private-key");
  assert.equal(request.options.headers["Content-Type"], "application/json");
  context.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: "Chave inválida" }) });
  await assert.rejects(vm.runInContext('apiRequest("/data")', context), /Chave inválida/);
});

test("HTML contém IDs únicos e carrega configuração antes do cliente", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  assert.ok(html.indexOf("js/config.js") < html.indexOf("js/api.js"));
  assert.ok(html.indexOf("js/api.js") < html.indexOf("js/dashboard.js"));
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^\"]+)"/g)) await readFile(new URL(match[1], root));
  const css = await readFile(new URL("css/style.css", root), "utf8");
  assert.ok(!css.includes("<div"));
});
