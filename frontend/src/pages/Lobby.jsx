import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import socket from "../socket";

export default function Lobby() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [ready, setReady] = useState(false);

  console.log("Lobby component - Socket ID:", socket.id);
  console.log("Lobby component - Room Code:", roomCode);

  // Fetch already existing users in room
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        console.log("Fetching users for room:", roomCode);
        const res = await axios.get(`/api/${roomCode}/getAllUsers`);
        console.log("Fetched users:", res.data.users);
        setUsers(res.data.users);

        const resp = await axios.get("/api/getUser", {
          params: {
            socketID: socket.id,
            roomCode: roomCode,
          },
        });

        console.log("Current Page user ", resp.data.username);
        setUsername(resp.data.username);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [roomCode]);

  useEffect(() => {
    console.log("Setting up socket listeners for room:", roomCode);

    // Socket event listeners
    const handleUserReady = (userIndex) => {
      console.log("User ready event received:", userIndex);
      setUsers((prevUsers) =>
        prevUsers.map((user, index) =>
          index === userIndex ? { ...user, ready: !user.ready } : user
        )
      );
    };

    const handleUserListUpdated = (updatedUsers) => {
      console.log("User list updated event received:", updatedUsers);
      setUsers(updatedUsers);
      // Redirect if all users are ready
      if (updatedUsers.length > 0 && updatedUsers.every((user) => user.ready)) {
        toast.success("All users ready! Starting game...");
        navigate(`/${roomCode}/game`);
      }
    };

    socket.on("user-list-updated", handleUserListUpdated);

    // Cleanup
    return () => {
      console.log("Cleaning up socket listeners");
      socket.off("user-ready", handleUserReady);
      socket.off("user-list-updated", handleUserListUpdated);
    };
  }, [roomCode, navigate]);

  const allReady = () => {
    if (users.length === 0) return false;
    return users.every((user) => user.ready);
  };
  const toggleUserReady = () => {
    setUsers((prevUsers) => {
      const updatedUsers = prevUsers.map((user) =>
        user.username === username ? { ...user, ready: !user.ready } : user
      );

      // Emit after updating
      socket.emit("send-user-details", updatedUsers, roomCode);
      return updatedUsers;
    });

    setReady((prev) => !prev);

    setTimeout(() => {
      if (allReady()) {
        toast.success("All users ready! Starting game...");
        navigate(`/${roomCode}/game`);
      }
    }, 100);
  };

  if (loading)
    return (
      <div className="container">
        <p className="status muted">Loading...</p>
      </div>
    );
  if (error)
    return (
      <div className="container">
        <p className="status error">Error: {error}</p>
      </div>
    );

  return (
    <div className="container">
      <h1>Lobby — Room: {roomCode}</h1>
      <h2>Players ({users.length})</h2>
      <div className="user-list">
        {users.length === 0 ? (
          <p className="status muted">No users in the lobby yet...</p>
        ) : (
          users.map((user, index) => (
            <div key={index} className="user-item">
              <span
                style={{
                  color:
                    user.username === username ? "var(--accent)" : "inherit",
                }}
              >
                {user.username}
                {user.username === username && " (YOU)"}
              </span>
              <span
                className={`ready-badge ${user.ready ? "ready" : "not-ready"}`}
              >
                {user.ready ? "Ready" : "Not Ready"}
              </span>
            </div>
          ))
        )}
      </div>

      {users.length > 0 && (
        <button
          className="btn"
          onClick={toggleUserReady}
          style={{ marginTop: "1rem" }}
        >
          {ready ? "Set Not Ready" : "Set Ready"}
        </button>
      )}

      {allReady() && users.length > 0 && (
        <p className="status success" style={{ marginTop: "1rem" }}>
          All users are ready!
        </p>
      )}
    </div>
  );
}
