import { Router } from "express";
import {
  getChannelSubscribers,
  getSubscribedChannels,
  toggleSubscription,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const subscriptionRouter = Router();

subscriptionRouter
  .route("/toggle/c/:channelId")
  .post(verifyJWT, toggleSubscription);
subscriptionRouter.route("/channel/:channelId").get(getChannelSubscribers);
subscriptionRouter
  .route("/subscribed/:subscriberId")
  .get(getSubscribedChannels);

export default subscriptionRouter;
