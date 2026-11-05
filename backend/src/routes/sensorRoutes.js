import { Router } from "express";
import db from "../config/database.js";

import {
  esp,
  dbta,
  atualizarESP,
  salvarLeitura,
  obterMedia
} from "../services/espService.js";

const router = Router();

// Retorna o estado do ESP32 e do banco
router.get("/data", (req, res) => {
  res.json({
    esp,
    dbta
  });
});

// Retorna a média das leituras
router.get("/powerData", async (req, res) => {
  try {
    const media = await obterMedia();

    if (media === null) {
      return res.status(404).json({
        error: "Nenhuma leitura disponível"
      });
    }

    res.json({
      data: media
    });
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      error: "Erro ao consultar leituras"
    });
  }
});

// Recebe informações do ESP32
router.post("/heartbeat", async (req, res) => {
  try {
    const { power, status, ack } = req.body;

    if (
      typeof power !== "number" ||
      !Number.isFinite(power) ||
      typeof status !== "string"
    ) {
      return res.status(400).json({
        error: "Dados inválidos"
      });
    }

    const resposta = atualizarESP({
      power,
      status,
      ack
    });

    // Responde ao ESP32 antes da gravação no banco
    res.json(resposta);

    try {
      await salvarLeitura();
    } catch (erro) {
      dbta.connected = false;
      console.error("Erro ao registrar leitura:", erro);
    }
  } catch (erro) {
    console.error(erro);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Erro ao processar heartbeat"
      });
    }
  }
});

// Consulta os registros de manutenção
router.get("/logs", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT *
      FROM maintenanceLogs
      ORDER BY createdAt DESC
      LIMIT 100
    `);

    res.json(rows);
  } catch (erro) {
    console.error(erro);

    res.status(500).json({
      error: "Erro ao consultar logs"
    });
  }
});

export default router;
