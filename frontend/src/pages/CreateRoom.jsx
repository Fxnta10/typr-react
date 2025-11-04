import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import socket from "../socket";

export default function CreateRoom() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Connect socket when component mounts
    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      console.log("Connected to server with ID:", socket.id);
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      console.log("Disconnected from server");
      setSocketConnected(false);
    };

    const handleConnectError = (error) => {
      console.error("Socket connection error:", error);
      setSocketConnected(false);
      toast.error("Failed to connect to server");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    // Check if already connected
    if (socket.connected) {
      setSocketConnected(true);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!username.trim()) {
        toast.error("Username cannot be empty");
        return;
      }

      if (!socketConnected || !socket.id) {
        toast.error("Socket not connected. Please wait and try again.");
        console.log("Socket status:", {
          connected: socketConnected,
          id: socket.id,
        });
        return;
      }

      console.log("Creating room with socket ID:", socket.id);
      console.log("Before API call:", socketConnected, socket.id);

      // Call create room API
      const res = await axios.post("/api/createroom", {
        username: username.trim(),
        socketID: socket.id,
      });

      if (!res.data.success) {
        toast.error(res.data.error);
        setError(res.data.error);
      } else {
        toast.success(`Room ${res.data.room.roomCode} created successfully!`);
        // Navigate to the lobby with the room code
        navigate(`/${res.data.room.roomCode}/lobby`);
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.message || "An error occurred";
      toast.error(errorMessage);
      setError(errorMessage);
      console.error("Create room error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div>
        <h1>Create New Room</h1>
        <p>Create a new typing race room and invite your friends</p>
      </div>

      <div>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username">Your Username</label>
            <input
              type="text"
              name="username"
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              maxLength={20}
            />
          </div>

          <button type="submit" disabled={loading || !socketConnected}>
            {loading ? "Creating Room..." : "Create Room"}
          </button>
        </form>

        {loading && <p>Creating your room...</p>}

        {!socketConnected && (
          <p style={{ color: "orange" }}>
            Connecting to server...
            {socket.id && <span> (Socket ID: {socket.id})</span>}
          </p>
        )}

        {socketConnected && (
          <p style={{ color: "green" }}>
            Connected to server ✓ (Socket ID: {socket.id})
          </p>
        )}

        <div>
          <span>
            Want to join an existing room?{" "}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate("/");
              }}
            >
              Join Room
            </a>
          </span>
        </div>
      </div>
    </main>
  );
}
