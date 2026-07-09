import { Router, type IRouter } from "express";
import healthRouter from "./health";
import analysisRouter from "./analysis";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(analysisRouter);
router.use(historyRouter);

export default router;
