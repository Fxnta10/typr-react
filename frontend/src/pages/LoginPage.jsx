import React, { useEffect } from "react";
import socket from "../socket";
import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "axios";
import { useNavigate } from "react-router-dom";
export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [formDetails, setFormDetails] = useState({
    username: "",
    roomCode: "",
  });

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
    e.preventDefault(); // Prevent default form submission
    setLoading(true);
    setError(null); // Clear previous errors

    try {
      if (
        formDetails.username.trim() === "" ||
        formDetails.roomCode.trim() === ""
      ) {
        toast.error("Parameters cannot be empty");
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

      console.log("Joining room with socket ID:", socket.id);

      const res = await axios.post("/api/joinroom", {
        username: formDetails.username,
        roomCode: formDetails.roomCode,
        socketID: socket.id,
      });

      if (!res.data.success) {
        toast.error(res.data.error);
        setError(res.data.error);
      } else {
        toast.success("Successfully joined room!");
        navigate(`/${formDetails.roomCode}/lobby`);
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.message || "An error occurred";
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <div>
        <h1>Type Racer</h1>
        <p>Join a race and test your typing speed</p>
      </div>

      <div>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="username">Username</label>
            <input
              type="text"
              name="username"
              id="username"
              onChange={(e) =>
                setFormDetails((prev) => ({
                  ...prev,
                  username: e.target.value,
                }))
              }
              value={formDetails.username}
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="roomcode">Room Code</label>
            <input
              type="text"
              name="roomcode"
              id="roomcode"
              onChange={(e) =>
                setFormDetails((prev) => ({
                  ...prev,
                  roomCode: e.target.value,
                }))
              }
              value={formDetails.roomCode}
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading || !socketConnected}>
            {loading ? "Joining..." : "Join Room"}
          </button>
        </form>

        {loading && <p>Loading...</p>}

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
            Don't have a room? <Link to="create">Create one</Link> or join a
            public race.
          </span>
        </div>
      </div>
    </main>
  );
}
