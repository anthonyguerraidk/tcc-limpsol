import { test, before, after } from "node:test";
import assert from "node:assert/strict";
process.env.NODE_ENV = "production";
process.env.ADMIN_API_KEY = "a".repeat(32);
process.env.DEVICE_API_KEY = "d".repeat(32);
process.env.FRONTEND_URL = "https://painel.example.com";
const { default: app } = await import("../src/app.js");
const { default: db } = await import("../src/config/database.js");
const { esp, verificarConexao, settings, carregarSettings } = await import("../src/services/espService.js");
let stored;
const writes = [];
db.execute = async (sql, params) => {
  writes.push({ sql, params });
  if (sql.startsWith("SELECT settingValue")) return [stored ? [{ settingValue: stored }] : []];
  if (sql.startsWith("INSERT INTO systemSettings")) stored = params[1];
  return [{ affectedRows: 1 }];
};
db.query = async () => [[]];
let server, base;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); await db.end(); });
const admin = { Authorization: `Bearer ${process.env.ADMIN_API_KEY}` };
const device = { Authorization: `Bearer ${process.env.DEVICE_API_KEY}`, "Content-Type": "application/json" };
async function call(path, options) { return fetch(base + path, options); }

test("health retorna 503 quando MySQL falha e recupera", async () => {
  assert.equal((await call("/health")).status, 200);
  db.query = async () => { throw new Error("offline"); };
  assert.equal((await call("/health")).status, 503);
  db.query = async () => [[]];
  assert.equal((await call("/health")).status, 200);
});
test("chaves separam painel e ESP32", async () => {
  assert.equal((await call("/api/data")).status, 401);
  assert.equal((await call("/api/data", { headers: device })).status, 401);
  assert.equal((await call("/api/data", { headers: admin })).status, 200);
  assert.equal((await call("/api/heartbeat", { method: "POST", headers: admin })).status, 401);
});
test("CORS permite apenas origem configurada e preflight", async () => {
  const response = await call("/api/data", { method: "OPTIONS", headers: { Origin: process.env.FRONTEND_URL, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" } });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), process.env.FRONTEND_URL);
  const denied = await call("/api/data", { headers: { ...admin, Origin: "https://outro.example.com" } });
  assert.equal(denied.headers.get("access-control-allow-origin"), null);
});
test("ciclo ESP: valida entrada, entrega comando e conta conclusão uma vez", async () => {
  const beat = body => call("/api/heartbeat", { method: "POST", headers: device, body: JSON.stringify(body) });
  assert.equal((await beat({ power: "13", status: "idle" })).status, 400);
  assert.equal((await beat({ power: 13, status: "invalid" })).status, 400);
  esp.connected = false;
  assert.equal((await call("/api/clean/start", { method: "POST", headers: admin })).status, 503);
  assert.equal((await beat({ power: 12, status: "idle" })).status, 200);
  assert.equal((await call("/api/clean/start", { method: "POST", headers: admin })).status, 200);
  assert.equal((await call("/api/clean/start", { method: "POST", headers: admin })).status, 409);
  assert.deepEqual(await (await beat({ power: 12, status: "nowCleaning" })).json(), { command: "clean" });
  await beat({ power: 12, status: "doneCleaning" });
  await beat({ power: 12, status: "doneCleaning" });
  assert.equal(esp.panelsCleaned, 1);
  assert.equal(esp.command, "idle");
  esp.lastSeen = Date.now() - 31000; verificarConexao();
  assert.equal(esp.connected, false);
  assert.ok(writes.some(w => w.sql.includes("sensorReadings")));
});
test("automação valida e restaura configurações persistidas", async () => {
  const update = body => call("/api/settings/update/autoClean", { method: "POST", headers: { ...admin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await update({ autoClean: "true" })).status, 400);
  assert.equal((await update({ autoClean: true, autoCleanTrigger: 101 })).status, 400);
  assert.equal((await update({ autoClean: true, autoCleanTrigger: 35 })).status, 200);
  settings.autoClean = false;
  await carregarSettings();
  assert.equal(settings.autoClean, true);
  assert.equal(settings.autoCleanTrigger, 35);
});
