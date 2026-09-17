import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if ([name, description].some((field) => !field || field?.trim() === "")) {
    throw new ApiError(400, "Name and description are required");
  }

  const playlist = await Playlist.create({
    name: name.trim(),
    description: description.trim(),
    owner: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid userId");

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          { $project: { title: 1, thumbnail: 1, duration: 1, views: 1 } },
        ],
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "User playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlistId");

  const playlists = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
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
        ],
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
  ]);

  if (!playlists?.length) throw new ApiError(404, "Playlist not found");

  return res
    .status(200)
    .json(new ApiResponse(200, playlists[0], "Playlist fetched successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlistId");

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(404, "Playlist not found");

  if (playlist.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "Only owner can update this playlist");
  }

  const updateFields = {};
  if (name?.trim()) updateFields.name = name.trim();
  if (description?.trim()) updateFields.description = description.trim();

  if (Object.keys(updateFields).length === 0) {
    throw new ApiError(400, "Nothing to update");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $set: updateFields },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlistId");

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(404, "Playlist not found");

  if (playlist.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "Only owner can delete this playlist");
  }

  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlistId or videoId");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(404, "Playlist not found");

  if (playlist.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "Only owner can add videos to this playlist");
  }

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { videos: videoId } },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Video added to playlist")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlistId or videoId");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) throw new ApiError(404, "Playlist not found");

  if (playlist.owner?.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "Only owner can remove videos from this playlist");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Video removed from playlist")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  updatePlaylist,
  deletePlaylist,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
};
