import db from "../config/database.js";

// Configurações do sistema
export const settings = {
  autoClean: false,
  autoCleanTime: 60000,
  autoCleanTrigger: 40
};

export async function carregarSettings() {
  const [rows] = await db.execute("SELECT settingValue FROM systemSettings WHERE settingKey = ?", ["autoClean"]);
  if (rows.length) {
    const saved = JSON.parse(rows[0].settingValue);
    if (typeof saved.autoClean === "boolean") settings.autoClean = saved.autoClean;
    if (Number.isFinite(saved.autoCleanTrigger) && saved.autoCleanTrigger >= 0 && saved.autoCleanTrigger <= 100) settings.autoCleanTrigger = saved.autoCleanTrigger;
  }
}

export async function salvarSettings(values) {
  const updated = { ...settings, ...values };
  await db.execute("INSERT INTO systemSettings (settingKey, settingValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE settingValue = VALUES(settingValue)", ["autoClean", JSON.stringify(updated)]);
  Object.assign(settings, updated);
}

// Estado atual do ESP32
export const esp = {
  connected: false,
  lastSeen: 0,
  power: 0,
  panelsCleaned: 0,
  waterUsage: 0,
  dustLevel: 0,
  waterTank: 0,
  pumpStatus: false,
  command: "idle",
  ack: "...",
  status: "idle"
};

// Estado da conexão com o banco
export const dbta = {
  type: "mysql",
  connected: false
};

// Converte valores entre escalas
function mapa(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

// Solicita o início da limpeza
export function iniciarLimpeza() {
  if (!esp.connected) {
    return false;
  }

  if (esp.status === "nowCleaning" || esp.command === "clean") {
    return false;
  }

  esp.command = "clean";

  console.log("Comando de limpeza solicitado");

  return true;
}

// Recebe os dados enviados pelo ESP32
export function atualizarESP(dados) {
  const { power, status, ack } = dados;

  const statusAnterior = esp.status;

  esp.connected = true;
  esp.lastSeen = Date.now();

  if (Number.isFinite(Number(power))) {
    esp.power = Number(power);
  }

  if (typeof status === "string") {
    esp.status = status;
  }

  if (typeof ack === "string") {
    esp.ack = ack;
  }

  esp.pumpStatus = esp.status === "nowCleaning";

  // Registra apenas a transição para limpeza concluída
  if (esp.status === "doneCleaning" && statusAnterior !== "doneCleaning") {
    esp.panelsCleaned += 1;
    esp.command = "idle";
  }

  return {
    command: esp.command
  };
}

// Salva os dados recebidos no banco
export async function salvarLeitura() {
  const sql = `
    INSERT INTO sensorReadings
      (power, dustLevel, espStatus, commandAck)
    VALUES (?, ?, ?, ?)
  `;

  await db.execute(sql, [esp.power, esp.dustLevel, esp.status, esp.ack]);
  dbta.connected = true;
}

// Retorna leituras da última hora
export async function obterLeituras() {
  const [rows] = await db.query(`
    SELECT power, recordedAt
    FROM sensorReadings
    WHERE recordedAt >= NOW() - INTERVAL 1 HOUR
    ORDER BY recordedAt DESC
    LIMIT 100
  `);

  return rows;
}

// Calcula a potência média registrada
export async function obterMedia() {
  const leituras = await obterLeituras();

  if (leituras.length === 0) {
    return null;
  }

  const soma = leituras.reduce(
    (total, leitura) => total + Number(leitura.power),
    0
  );

  return Number((soma / leituras.length).toFixed(2));
}

// Verifica a necessidade de limpeza automática
export async function verificarLimpezaAutomatica() {
  if (!esp.connected || !settings.autoClean) {
    return;
  }

  const media = await obterMedia();

  if (media === null) {
    return;
  }

  esp.dustLevel = Math.max(0, Math.min(100, Number((100 - mapa(media, 0, 13, 0, 100)).toFixed(2))));

  if (esp.dustLevel > settings.autoCleanTrigger) {
    iniciarLimpeza();
  }
}

// Verifica se o ESP32 continua conectado
export function verificarConexao() {
  if (Date.now() - esp.lastSeen > 30000) {
    esp.connected = false;
    esp.pumpStatus = false;
    esp.command = "idle";
  }
}
