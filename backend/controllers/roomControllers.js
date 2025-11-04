const Room = require("../models/Room");

const getAllUsers = async (req, res) => {
  try {
    const { roomCode } = req.params;

    if (!roomCode || roomCode.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Room code cannot be empty",
      });
    }

    const room = await Room.findOne({ roomCode: roomCode });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Cannot find room with the code",
      });
    }

    const users = room.usernames.map((username) => ({
      username,
      ready: false, // Default ready state
    }));

    return res.status(200).json({
      success: true,
      users,
      userCount: users.length,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

const roomDetails = async (req, res) => {
  try {
    const { roomCode } = req.params;

    if (!roomCode || roomCode.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Room code cannot be empty",
      });
    }

    const room = await Room.findOne({ roomCode: roomCode });

    if (!room) {
      return res.status(404).json({
        success: false,
        error: "Cannot find room with the code",
      });
    }

    const paragraph = room.paragraph;
    const users = room.usernames.map((username) => ({
      username,
      ready: false,
    }));

    return res.status(200).json({
      success: true,
      users,
      paragraph,
      userCount: users.length,
      roomCode: room.roomCode,
    });
  } catch (error) {
    console.error("Error in roomDetails:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

module.exports = {
  getAllUsers,
  roomDetails,
};
