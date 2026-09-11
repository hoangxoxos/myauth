import app from "./app.js";
import { env } from "./config/env.js";
import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const HTTP_PORT = env.PORT || 3000;
const HTTPS_PORT = 3443;

const httpServer = http.createServer(app);
httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP Server is running at http://localhost:${HTTP_PORT} `);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, "../ssl/server.key")),
  cert: fs.readFileSync(path.join(__dirname, "../ssl/server.cert")),
};

const httpsServer = https.createServer(httpsOptions, app);
httpsServer.listen(HTTPS_PORT, () => {
  console.log(`HTTPS Server is running at https://localhost:${HTTPS_PORT}`);
});
