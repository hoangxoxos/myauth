import { env } from "../../config/env.js";

export function getServerUrl() {
  return `http://localhost:${env.PORT}`;
}
