import { Router } from "express";

import { settings, salvarSettings } from "../services/espService.js";

const router = Router();

// Consulta as configuraÃ§Ãµes atuais
router.get("/settings", (req, res) => {
  res.json(settings);
});

// Atualiza a limpeza automÃ¡tica
router.post("/settings/update/autoClean", async (req, res) => {
  const { autoClean, autoCleanTrigger } = req.body || {};

  if (typeof autoClean !== "boolean" || (autoCleanTrigger !== undefined &&
      (!Number.isFinite(autoCleanTrigger) || autoCleanTrigger < 0 || autoCleanTrigger > 100))) {
    return res.status(400).json({ error: "ConfiguraÃ§Ãµes invÃ¡lidas" });
  }
  await salvarSettings({ autoClean, ...(autoCleanTrigger !== undefined ? { autoCleanTrigger } : {}) });

  res.json({
    message: "ConfiguraÃ§Ãµes atualizadas",
    settings
  });
});

export default router;
