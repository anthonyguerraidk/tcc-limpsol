// Única configuração pública: altere para a URL HTTPS do serviço Render.
// Nunca coloque chaves ou senhas neste arquivo.
window.LIMPSOL_CONFIG = {
  apiBaseUrl: ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? "http://localhost:3000/api"
    : "https://SEU-SERVICO.onrender.com/api"
};
