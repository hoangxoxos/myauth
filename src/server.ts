import app from "./app.js";
import { env } from "./config/env.js";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HTTP_PORT = env.PORT || 3000;

const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, () => {
  console.log(`Server is running at http://localhost:${HTTP_PORT} `);
});
