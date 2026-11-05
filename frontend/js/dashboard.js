let connected = false;
let busy = false;
let autoClean = false;
let polling = false;

function showMessage(message) {
  document.getElementById("connectionMessage").textContent = message;
}
function setStatus(id, online) {
  const element = document.getElementById(id);
  element.textContent = online ? "UP" : "DOWN";
  element.style.color = online ? "green" : "red";
}
function updateButtons() {
  document.getElementById("clen").disabled = !connected || busy;
}
async function getInfo() {
  if (polling) return;
  polling = true;
  try {
    const [data, settings] = await Promise.all([apiRequest("/data"), apiRequest("/settings")]);
    const esp = data.esp;
    connected = esp.connected;
    busy = esp.command === "clean" || esp.status === "nowCleaning";
    setStatus("dbStatus", data.dbta.connected);
    setStatus("espStatus", connected);
    document.getElementById("dotdb").style.color = data.dbta.connected ? "green" : "red";
    document.getElementById("dotesp").style.color = connected ? "green" : "red";
    document.getElementById("panelsCleaned").textContent = esp.panelsCleaned;
    document.getElementById("waterUsage").textContent = `${esp.waterUsage} L`;
    document.getElementById("voltageInput").textContent = `${esp.power} V`;
    document.getElementById("dustLevel").textContent = `${esp.dustLevel}%`;
    document.getElementById("waterTank").textContent = `${esp.waterTank}%`;
    document.getElementById("pumpStatus").textContent = connected ? (esp.pumpStatus ? "Active" : "Stopped") : "Unknown";
    autoClean = settings.autoClean;
    document.getElementById("autoMode").checked = autoClean;
    showMessage(connected ? "Conectado" : "API conectada. Aguardando ESP32.");
  } catch (error) {
    connected = false;
    setStatus("dbStatus", false);
    setStatus("espStatus", false);
    showMessage(error.message);
  } finally {
    updateButtons(); polling = false;
  }
}
async function startCleaning() {
  busy = true; updateButtons();
  try {
    await apiRequest("/clean/start", { method: "POST" });
    showMessage("Limpeza solicitada. Aguardando confirmação do ESP32.");
  } catch (error) {
    busy = false; updateButtons(); showMessage(error.message);
  }
}
async function getLogs() {
  const container = document.getElementById("logEntries");
  container.textContent = "Carregando...";
  try {
    const logs = await apiRequest("/logs");
    container.replaceChildren();
    if (!logs.length) container.textContent = "Nenhum registro disponível.";
    for (const log of logs) {
      const item = document.createElement("div"); item.className = "log-item";
      for (const [tag, value] of [["div", new Date(log.createdAt).toLocaleString("pt-BR")], ["strong", log.eventType], ["p", log.description], ["div", log.severity]]) {
        const element = document.createElement(tag); element.textContent = value; item.append(element);
      }
      container.append(item);
    }
  } catch (error) { container.textContent = error.message; }
}
function changePage(page) {
  for (const name of ["dashboard", "logs"]) document.getElementById(name).hidden = name !== page;
  if (page === "logs") getLogs();
}
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("accessForm").addEventListener("submit", event => {
    event.preventDefault();
    accessKey = document.getElementById("accessKey").value.trim();
    document.getElementById("accessKey").value = "";
    getInfo();
  });
  document.getElementById("autoMode").addEventListener("change", async function () {
    this.disabled = true;
    try {
      const result = await apiRequest("/settings/update/autoClean", {
        method: "POST", body: JSON.stringify({ autoClean: this.checked })
      });
      autoClean = result.settings.autoClean;
    } catch (error) { showMessage(error.message); }
    finally { this.checked = autoClean; this.disabled = false; }
  });
  updateButtons(); getInfo();
  setInterval(getInfo, 5000);
});
