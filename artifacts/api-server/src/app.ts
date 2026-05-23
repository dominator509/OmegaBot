import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { apiAuthMiddleware } from "./lib/api-auth.js";
import { requireSession } from "./lib/session-auth.js";
import { logger } from "./lib/logger";

const app: Express = express();

const isProduction = process.env.NODE_ENV === "production";

app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? undefined
      : false,
    crossOriginEmbedderPolicy: false,
  }),
);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : undefined;

if (isProduction && !allowedOrigins) {
  logger.warn("ALLOWED_ORIGINS is not set — CORS is open to all origins in production. Set ALLOWED_ORIGINS to restrict access.");
}

app.use(
  cors({
    origin: allowedOrigins ?? (isProduction ? [] : true),
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400,
  }),
);

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please try again shortly." },
  skip: () => !isProduction,
});

const mutateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many write requests — please slow down." },
  skip: () => !isProduction,
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true, limit: "512kb" }));
app.use(cookieParser());

app.use("/api", generalLimiter);
app.use("/api", (req, _res, next) => {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    mutateLimiter(req, _res, next);
  } else {
    next();
  }
});
app.use("/api", apiAuthMiddleware);
app.use("/api", requireSession);
app.use("/api", router);

app.use("/api/*path", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const log = (req as Request & { log?: typeof logger }).log ?? logger;
  log.error({ err }, "Unhandled error");
  const status = (err as { status?: number; statusCode?: number })?.status
    ?? (err as { status?: number; statusCode?: number })?.statusCode
    ?? 500;
  const message = isProduction
    ? "Internal server error"
    : (err instanceof Error ? err.message : "Internal server error");
  res.status(status).json({ error: message });
});

export default app;
