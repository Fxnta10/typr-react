const Room = require("../models/Room");

// Generate a random 4-digit room code
const generateRoomCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const joinRoom = async (req, res) => {
  try {
    const { username, roomCode, socketID } = req.body;

    console.log("JOIN ROOM REQUEST:", { username, roomCode, socketID });

    // Validation - check if required fields are provided
    if (!username || !roomCode || !socketID) {
      return res.status(400).json({
        success: false,
        error: "Username, room code, and socket ID are required",
      });
    }

    // Find the room
    const room = await Room.findOne({ roomCode: roomCode });
    if (!room) {
      return res
        .status(404)
        .json({ success: false, error: "Room doesn't exist" });
    }

    // Check if username already exists in the room
    const usernameExists = room.usernames.includes(username);
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        error: "Username already taken, try another username",
      });
    }

    // Add user to room
    room.usernames.push(username);
    room.sockets.push(socketID);
    await room.save();

    console.log("Room after adding user:", {
      roomCode,
      usernames: room.usernames,
      sockets: room.sockets,
    });

    // Get socket.io instance from app
    const io = req.app.get("io");
    if (io) {
      // Join the socket to the room
      const socket = io.sockets.sockets.get(socketID);
      if (socket) {
        socket.join(roomCode);
        console.log(`Socket ${socketID} joined room ${roomCode}`);

        // Emit updated user list to all clients in the room
        const users = room.usernames.map((u) => ({
          username: u,
          ready: false,
        }));

        console.log("Emitting user-list-updated to room:", roomCode, users);
        console.log(
          "Sockets in room:",
          Array.from(io.sockets.adapter.rooms.get(roomCode) || [])
        );

        io.to(roomCode).emit("user-list-updated", users);
      } else {
        console.error(`Socket ${socketID} not found in io.sockets.sockets`);
      }
    } else {
      console.error("io instance is not available");
    }

    return res.status(200).json({
      success: true,
      message: `User: ${username} successfully joined room ${roomCode}`,
      room: {
        roomCode: room.roomCode,
        usernames: room.usernames,
        userCount: room.usernames.length,
      },
    });
  } catch (error) {
    console.error("Error in joinRoom:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

const createRoom = async (req, res) => {
  try {
    const { username, socketID } = req.body;

    console.log("CREATE ROOM REQUEST:", { username, socketID });

    // Validation
    if (!username || !socketID) {
      return res.status(400).json({
        success: false,
        error: "Username and socketID are required",
      });
    }

    // Generate unique room code
    let roomCode;
    let roomExists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (roomExists && attempts < maxAttempts) {
      roomCode = generateRoomCode();
      const existingRoom = await Room.findOne({ roomCode });
      roomExists = !!existingRoom;
      attempts++;
    }

    if (roomExists) {
      return res.status(500).json({
        success: false,
        error: "Unable to generate unique room code. Please try again.",
      });
    }

    // Create new room
    const newRoom = new Room({
      roomCode: roomCode,
      usernames: [username],
      sockets: [socketID],
      paragraph:
        "paragraphs are the building blocks of papers many students define paragraphs in terms of length a paragraph is a group of at least five sentences a paragraph is half a page long etc in reality though the unity and coherence of ideas among sentences is what constitutes a paragraph a paragraph is defined as a group of sentences or a single sentence that forms a unit lunsford and connors 116 length and appearance do not determine whether a section in a paper is a paragraph for instance in some styles of writing particularly journalistic styles a paragraph can be just one sentence long ultimately a paragraph is a sentence or group of sentences that support one main idea in this handout we will refer to this as the controlling idea because it controls what happens in the rest of the paragraph",
      results: [],
    });

    await newRoom.save();

    console.log("Room created:", {
      roomCode,
      usernames: newRoom.usernames,
      sockets: newRoom.sockets,
    });

    // Get socket.io instance from app
    const io = req.app.get("io");
    if (io) {
      // Join the socket to the room
      const socket = io.sockets.sockets.get(socketID);
      if (socket) {
        socket.join(roomCode);
        console.log(`Socket ${socketID} joined room ${roomCode}`);

        // Emit initial user list to the room
        const users = newRoom.usernames.map((u) => ({
          username: u,
          ready: false,
        }));

        console.log("Emitting user-list-updated to room:", roomCode, users);
        io.to(roomCode).emit("user-list-updated", users);
      } else {
        console.error(`Socket ${socketID} not found in io.sockets.sockets`);
      }
    } else {
      console.error("io instance is not available");
    }

    return res.status(201).json({
      success: true,
      message: `Room ${roomCode} created successfully`,
      room: {
        roomCode: newRoom.roomCode,
        usernames: newRoom.usernames,
        userCount: newRoom.usernames.length,
      },
    });
  } catch (error) {
    console.error("Error in createRoom:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

module.exports = {
  joinRoom,
  createRoom,
};
