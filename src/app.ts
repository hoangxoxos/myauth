import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
import router from "./index.routes.js";

const app = express();

app.set("trust-proxy", true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(cookieParser());

app.use("/", router);

app.use(notFound);
app.use(errorHandler);

export default app;
