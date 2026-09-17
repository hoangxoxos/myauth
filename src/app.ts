import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import router from "./index.routes.js";

const app = express();

app.use((req, res, next) => {
  const startedAt = performance.now();

  res.on("finish", () => {
    console.log(
      `${req.method} ${req.originalUrl} - ${(performance.now() - startedAt).toFixed(0)}ms`,
    );
  });

  next();
});

app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: new URL(env.FRONTEND_URL).origin,
    credentials: true,
  }),
);
app.use(cookieParser());

app.use("/", router);

app.use(notFound);
app.use(errorHandler);

export default app;
