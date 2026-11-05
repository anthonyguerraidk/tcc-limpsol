import "dotenv/config";

import express from "express";
import cors from "cors";

import db from "./config/database.js";

import sensorRoutes from "./routes/sensorRoutes.js";
import cleaningRoutes from "./routes/cleaningRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

import {
  dbta,
  settings,
  verificarConexao,
  verificarLimpezaAutomatica
} from "./services/espService.js";

const app = express();

const PORT = Number(process.env.PORT || 3000);

// Configuração do CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL
  })
);

// Interpretação de JSON
app.use(express.json());

// Rotas
app.use("/api", sensorRoutes);
app.use("/api", cleaningRoutes);
app.use("/api", settingsRoutes);

// Rota de verificação do servidor
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "API do sistema de limpeza solar"
  });
});

// Inicialização do backend
async function iniciarServidor() {
  try {
    // Testa a conexão com o MySQL
    await db.query("SELECT 1");

    dbta.connected = true;

    console.log("✅ MySQL conectado!");

    // Verifica periodicamente a conexão do ESP32
    setInterval(verificarConexao, 1000);

    // Verifica as condições para limpeza automática
    setInterval(async () => {
      try {
        await verificarLimpezaAutomatica();
      } catch (erro) {
        console.error("Erro na limpeza automática:", erro);
      }
    }, settings.autoCleanTime);

    // Inicia o Express
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  } catch (erro) {
    console.error("❌ Não foi possível iniciar o servidor:", erro);

    process.exitCode = 1;
  }
}

iniciarServidor();
