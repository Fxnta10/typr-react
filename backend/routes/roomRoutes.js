const express = require("express");
const { getAllUsers, roomDetails } = require("../controllers/roomControllers");

const roomRouter = express.Router();

roomRouter.post("/getAllUsers", getAllUsers);
roomRouter.post("/roomDetails", roomDetails);

module.exports = roomRouter;
