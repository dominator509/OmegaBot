import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import runsRouter from "./runs";
import commandsRouter from "./commands";
import approvalsRouter from "./approvals";
import eventsRouter from "./events";
import adaptersRouter from "./adapters";
import llmRouter from "./llm";
import integrationsRouter from "./integrations";
import githubRouter from "./github";
import chatRouter from "./chat";
import controlRouter from "./control";
import artifactsStoreRouter from "./artifacts-store";
import settingsRouter from "./settings";
import overviewRouter from "./overview";
import providersRouter from "./providers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(runsRouter);
router.use(commandsRouter);
router.use(approvalsRouter);
router.use(eventsRouter);
router.use(adaptersRouter);
router.use(llmRouter);
router.use(integrationsRouter);
router.use(githubRouter);
router.use(chatRouter);
router.use(controlRouter);
router.use(artifactsStoreRouter);
router.use(settingsRouter);
router.use(overviewRouter);
router.use(providersRouter);

export default router;
