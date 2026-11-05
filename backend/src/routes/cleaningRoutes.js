import { Router } from "express";

import { esp, iniciarLimpeza } from "../services/espService.js";

const router = Router();

// Solicita uma limpeza manual
router.post("/clean/start", (req, res) => {
  if (!esp.connected) {
    return res.status(503).json({
      error: "ESP32 desconectado"
    });
  }

  if (esp.status === "nowCleaning") {
    return res.status(409).json({
      error: "Limpeza já está em andamento"
    });
  }

  const iniciado = iniciarLimpeza();

  if (!iniciado) {
    return res.status(409).json({
      error: "Não foi possível solicitar a limpeza"
    });
  }

  res.json({
    message: "Comando de limpeza enviado",
    command: esp.command
  });
});

export default router;
