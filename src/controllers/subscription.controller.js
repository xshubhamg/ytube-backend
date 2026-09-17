import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId))
    throw new ApiError(400, "Invalid channelId");

  if (channelId.toString() === req.user?._id?.toString()) {
    throw new ApiError(400, "Cannot subscribe to yourself");
  }

  const channel = await User.findById(channelId);
  if (!channel) throw new ApiError(404, "Channel not found");

  const existingSubscription = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  if (existingSubscription) {
    await Subscription.findByIdAndDelete(existingSubscription._id);
    return res
      .status(200)
      .json(new ApiResponse(200, { isSubscribed: false }, "Unsubscribed"));
  }

  await Subscription.create({
    subscriber: req.user?._id,
    channel: channelId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { isSubscribed: true }, "Subscribed"));
});

const getChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId))
    throw new ApiError(400, "Invalid channelId");

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          { $project: { fullname: 1, username: 1, avatar: 1 } },
        ],
      },
    },
    { $addFields: { subscriber: { $first: "$subscriber" } } },
    { $sort: { createdAt: -1 } },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "Channel subscribers fetched successfully"
      )
    );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId))
    throw new ApiError(400, "Invalid subscriberId");

  const channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
        pipeline: [
          { $project: { fullname: 1, username: 1, avatar: 1, coverImage: 1 } },
        ],
      },
    },
    { $addFields: { channel: { $first: "$channel" } } },
    { $sort: { createdAt: -1 } },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channels,
        "Subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getChannelSubscribers, getSubscribedChannels };
