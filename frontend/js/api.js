const API = window.LIMPSOL_CONFIG.apiBaseUrl.replace(/\/+$/, "");
let accessKey = "";

async function apiRequest(path, options = {}) {
  if (API.includes("SEU-SERVICO")) throw new Error("Configure a URL do Render em js/config.js.");
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(accessKey ? { Authorization: `Bearer ${accessKey}` } : {})
    },
    signal: AbortSignal.timeout(60000)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Falha HTTP ${response.status}`);
  return data;
}
