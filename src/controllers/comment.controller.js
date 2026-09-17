import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");

  const aggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          { $project: { fullname: 1, username: 1, avatar: 1 } },
        ],
      },
    },
    { $addFields: { owner: { $first: "$owner" } } },
    { $sort: { createdAt: -1 } },
  ]);

  const comments = await Comment.aggregatePaginate(aggregate, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");
  if (!content?.trim()) throw new ApiError(400, "Content is required");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  const comment = await Comment.create({
    content: content.trim(),
    video: videoId,
    owner: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(commentId))
    throw new ApiError(400, "Invalid commentId");
  if (!content?.trim()) throw new ApiError(400, "Content is required");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  if (comment.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "Only owner can update this comment");
  }

  comment.content = content.trim();
  await comment.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId))
    throw new ApiError(400, "Invalid commentId");

  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, "Comment not found");

  if (comment.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "Only owner can delete this comment");
  }

  await Comment.findByIdAndDelete(commentId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
