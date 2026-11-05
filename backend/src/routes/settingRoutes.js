import { Router } from "express";

import { settings } from "../services/espService.js";

const router = Router();

// Consulta as configurações atuais
router.get("/settings", (req, res) => {
  res.json(settings);
});

// Atualiza a limpeza automática
router.post("/settings/update/autoClean", (req, res) => {
  const { autoClean, autoCleanTrigger } = req.body;

  if (typeof autoClean === "boolean") {
    settings.autoClean = autoClean;
  }

  if (
    typeof autoCleanTrigger === "number" &&
    Number.isFinite(autoCleanTrigger) &&
    autoCleanTrigger >= 0 &&
    autoCleanTrigger <= 100
  ) {
    settings.autoCleanTrigger = autoCleanTrigger;
  }

  res.json({
    message: "Configurações atualizadas",
    settings
  });
});

export default router;
