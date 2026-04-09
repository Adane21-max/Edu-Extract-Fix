import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import adminsRouter from "./admins";
import subjectsRouter from "./subjects";
import questionsRouter from "./questions";
import sessionsRouter from "./sessions";
import feedbackRouter from "./feedback";
import dashboardRouter from "./dashboard";
import gradePricesRouter from "./grade-prices";
import announcementsRouter from "./announcements";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studentsRouter);
router.use(adminsRouter);
router.use(subjectsRouter);
router.use(questionsRouter);
router.use(sessionsRouter);
router.use(feedbackRouter);
router.use(dashboardRouter);
router.use(gradePricesRouter);
router.use(announcementsRouter);

export default router;
