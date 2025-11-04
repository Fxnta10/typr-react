const express = require("express");
const { joinRoom, createRoom } = require("../controllers/loginControllers");

const loginRouter = express.Router();

loginRouter.post("/joinroom", joinRoom);
loginRouter.post("/createroom", createRoom);

module.exports = loginRouter;
