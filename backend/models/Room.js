const mongoose = require("mongoose");
const { Schema } = mongoose;

const RoomSchema = new Schema({
  usernames: [{ type: String }], // Array of usernames
  roomCode: { type: String, required: true, unique: true }, // Room code
  sockets: [{ type: String }], // Array of socket IDs
  paragraph: { type: String }, // Array of paragraph lines or sentences
  results: [
    {
      username: { type: String, required: true },
      wpm: { type: Number },
      accuracy: { type: Number }, // Percentage accuracy, like 95.6
    },
  ],
});

const Room = mongoose.model("Room", RoomSchema);

module.exports = Room;
