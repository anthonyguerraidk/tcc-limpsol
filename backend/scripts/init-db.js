import { readFile } from "node:fs/promises";
import db from "../src/config/database.js";
try {
  const sql = await readFile(new URL("../database/schema.sql", import.meta.url), "utf8");
  for (const statement of sql.split(";").map(v => v.trim()).filter(Boolean)) await db.query(statement);
  console.log("Tabelas criadas/verificadas. Dados existentes preservados.");
} catch (error) {
  console.error("Falha ao preparar banco:", error.code || error.message); process.exitCode = 1;
} finally { await db.end(); }
