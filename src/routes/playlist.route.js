import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const playlistRouter = Router();

playlistRouter.route("/").post(verifyJWT, createPlaylist);
playlistRouter.route("/user/:userId").get(getUserPlaylists);
playlistRouter
  .route("/:playlistId")
  .get(getPlaylistById)
  .patch(verifyJWT, updatePlaylist)
  .delete(verifyJWT, deletePlaylist);
playlistRouter
  .route("/add/:videoId/:playlistId")
  .patch(verifyJWT, addVideoToPlaylist);
playlistRouter
  .route("/remove/:videoId/:playlistId")
  .patch(verifyJWT, removeVideoFromPlaylist);

export default playlistRouter;
