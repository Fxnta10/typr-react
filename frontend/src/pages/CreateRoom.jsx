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
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
    };

    const handleConnectError = (error) => {
      setSocketConnected(false);
      toast.error("Failed to connect to server");
      console.error("Socket connection error:", error);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    if (socket.connected) setSocketConnected(true);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, []);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!username.trim()) {
        toast.error("Username cannot be empty");
        return;
      }

      if (!socketConnected || !socket.id) {
        toast.error("Socket not connected. Please wait and try again.");
        return;
      }

      const res = await axios.post("/api/createroom", {
        username: username.trim(),
        socketID: socket.id,
      });

      if (!res.data.success) {
        toast.error(res.data.error);
        setError(res.data.error);
      } else {
        toast.success(`Room ${res.data.room.roomCode} created successfully!`);
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
    <div className="container">
      <div className="form-container">
        <h1>Create New Room</h1>
        <p>Create a new typing race room and invite your friends</p>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="username">Your Username</label>
            <input
              className="input-field"
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

          <button className="submit-button" type="submit" disabled={loading || !socketConnected}>
            {loading ? "Creating Room..." : "Create Room"}
          </button>
        </form>

        {loading && <p className="status muted">Creating your room...</p>}
        {!socketConnected && <p className="status muted">Connecting to server...</p>}
        {socketConnected && <p className="status success">Connected</p>}

        <div style={{ marginTop: '1rem' }}>
          <span>
            Want to join an existing room? {" "}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate("/");
              }}
              style={{ color: 'var(--accent)' }}
            >
              Join Room
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}

