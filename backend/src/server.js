import "dotenv/config";
import app from "./app.js";
import db from "./config/database.js";
import { dbta, settings, verificarConexao, verificarLimpezaAutomatica, carregarSettings } from "./services/espService.js";
let server;
const timers = [];
async function start() {
  if (process.env.NODE_ENV === "production") {
    for (const name of ["DB_HOST", "DB_USER", "DB_NAME", "DB_PASSWORD", "FRONTEND_URL", "ADMIN_API_KEY", "DEVICE_API_KEY"]) {
      if (!process.env[name]) throw new Error(`Variável obrigatória: ${name}`);
    }
    for (const name of ["ADMIN_API_KEY", "DEVICE_API_KEY"]) {
      if (process.env[name].length < 32) throw new Error(`${name} deve ter pelo menos 32 caracteres`);
    }
  }
  await db.query("SELECT 1 FROM sensorReadings LIMIT 1");
  await carregarSettings();
  dbta.connected = true;
  timers.push(setInterval(verificarConexao, 1000));
  let checking = false;
  timers.push(setInterval(async () => {
    if (checking) return;
    checking = true;
    try { await verificarLimpezaAutomatica(); }
    catch (error) { console.error("Falha na automação:", error.code || error.message); }
    finally { checking = false; }
  }, settings.autoCleanTime));
  server = app.listen(Number(process.env.PORT || 3000), "0.0.0.0", () => console.log("API Limpsol iniciada"));
}
async function shutdown() {
  timers.forEach(clearInterval);
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  if (server) await new Promise(resolve => server.close(resolve));
  await db.end();
  clearTimeout(deadline);
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
start().catch(async error => {
  console.error("Falha ao iniciar:", error.code || error.message);
  await shutdown(); process.exitCode = 1;
});
