import { existsSync } from "node:fs";
import express from "express";
import { resolve } from "node:path";
import { app } from "./app.js";

if (!process.env.OPENAI_API_KEY) console.warn("Aviso: OPENAI_API_KEY não definida.");

const dist = resolve("web/dist");
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(resolve(dist, "index.html")));
}

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => console.log(`API em http://localhost:${port}`));
