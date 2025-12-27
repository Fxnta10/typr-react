const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const PORT = process.env.PORT || 3000;
const path = require("path");
// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/typeracer";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB error:", error);
});

// Middleware
app.use(cors());
app.use(express.json());

const io = new Server(server, {
  path: "/api/ws",
  // cors: {
  //   origin: "*",
  //   methods: ["GET", "POST", "PUT", "DELETE"],
  // },
});

// Make io available to routes
app.set("io", io);

// Routes
const loginControllers = require("./controllers/loginControllers");
const roomControllers = require("./controllers/roomControllers");
const Room = require("./models/Room");

app.post("/api/joinroom", loginControllers.joinRoom);
app.post("/api/createroom", loginControllers.createRoom);
app.get("/api/:roomCode/getAllUsers", roomControllers.getAllUsers);
app.get("/api/:roomCode/details", roomControllers.roomDetails);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join-room", (roomCode) => {
    try {
      socket.join(roomCode);
      console.log(`Socket ${socket.id} joined room ${roomCode}`);
    } catch (e) {
      console.error("join-room error:", e);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
  socket.on("send-user-details", (users, roomCode) => {
    io.to(roomCode).emit("user-list-updated", users);
  });

  socket.on("game-details", (newUsers, roomCode) => {
    socket.to(roomCode).emit("recieve-game-details", newUsers);
  });

  socket.on("user-completed", (payload) => {
    try {
      const { msg, roomCode } = payload || {};
      if (!roomCode) return;
      socket.to(roomCode).emit("completion-message", msg);
    } catch (e) {
      console.error("user-completed error:", e);
    }
  });
});

app.get("/api/getUser", async (req, res) => {
  try {
    const { socketID, roomCode } = req.query;

    if (!socketID || !roomCode) {
      return res.status(400).json({ error: "Missing socketID or roomCode" });
    }

    const room = await Room.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }

    const userIndex = room.sockets.indexOf(socketID);
    if (userIndex !== -1) {
      const username = room.usernames[userIndex];
      return res.status(200).json({ username });
    }

    return res.status(404).json({ error: "User not found in room" });
  } catch (err) {
    console.error("Error in /api/getUser:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "../frontend/dist")));

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(path.join(__dirname, "../frontend/dist"));
});
