import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import socket from "../socket";

export default function Game() {
  const [loading, setLoading] = useState(false);
  const [paragraph, setParagraph] = useState([]);
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [error, setError] = useState(null);
  const { roomCode } = useParams();
  const [percentage, setPercentage] = useState(0);
  const paragraphLength = useRef(0);
  const [index, setIndex] = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  const navigate = useNavigate();

  const calculateAccuracy = useCallback((paragraph) => {
    if (!paragraph || paragraph.length === 0) return 100;

    let totalTyped = 0;
    let incorrect = 0;

    for (const letterObj of paragraph) {
      if (letterObj.valid !== -1) {
        totalTyped++;
        if (letterObj.valid === 0) incorrect++;
      }
    }

    if (totalTyped === 0) return 100;

    const accuracy = ((totalTyped - incorrect) / totalTyped) * 100;
    return parseFloat(accuracy.toFixed(2));
  }, []);

  const calculatePercentage = useCallback(() => {
    if (paragraphLength.current === 0) return 0;
    const percentage = (index / paragraphLength.current) * 100;
    return parseFloat(percentage.toFixed(2));
  }, [index]);

  const getRoomDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`/api/${roomCode}/details`);

      if (!res.data.success) {
        const errorMsg = res.data.error || "Failed to fetch room details";
        toast.error(errorMsg);
        setError(errorMsg);
        return;
      }

      let tempParagraph = [];
      for (const letter of res.data.paragraph) {
        tempParagraph.push({ letter, valid: -1 });
      }

      setParagraph(tempParagraph);
      paragraphLength.current = res.data.paragraph.length;

      const tempUsers = [];
      for (const user of res.data.users) {
        tempUsers.push({
          username: user.username,
          accuracy: 100,
          completion: 0,
        });
      }
      setUsers(tempUsers);

      const resp = await axios.get("/api/getUser", {
        params: {
          socketID: socket.id,
          roomCode: roomCode,
        },
      });

      setUsername(resp.data.username);
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || error.message || "Something went wrong";
      toast.error(errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  // Fetch room details on mount
  useEffect(() => {
    if (roomCode) getRoomDetails();
  }, [roomCode, getRoomDetails]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;

      // Don't process input if game is complete
      if (percentage >= 100) return;

      // Handle backspace
      if (key === "Backspace") {
        if (index > 0) {
          setIndex((prev) => prev - 1);
          setParagraph((prev) => {
            const newParagraph = [...prev];
            newParagraph[index - 1].valid = -1; // reset last typed char
            return newParagraph;
          });
        }
        return;
      }

      // Allow only alphanumeric + space + punctuation
      if (/^[a-zA-Z0-9 .,!?;:'"()-]$/.test(key)) {
        setParagraph((prev) => {
          const newParagraph = [...prev];
          if (newParagraph[index]) {
            newParagraph[index].valid =
              newParagraph[index].letter === key ? 1 : 0;
          }
          return newParagraph;
        });

        setIndex((prev) => prev + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [index, percentage]);

  // Update accuracy when paragraph changes
  useEffect(() => {
    const newAccuracy = calculateAccuracy(paragraph);
    setAccuracy(newAccuracy);
  }, [paragraph, calculateAccuracy]);

  // Update percentage when index changes
  useEffect(() => {
    const newPercentage = calculatePercentage();
    setPercentage(newPercentage);
  }, [index, calculatePercentage]);

  // Emit game details when stats change
  useEffect(() => {
    if (!username || users.length === 0) return;

    const updatedUsers = users.map((user) =>
      user.username === username
        ? { ...user, accuracy, completion: percentage }
        : user
    );

    // Only emit if something actually changed
    const hasChanged = updatedUsers.some((user, idx) => {
      const oldUser = users[idx];
      return (
        user.accuracy !== oldUser.accuracy ||
        user.completion !== oldUser.completion
      );
    });

    if (hasChanged) {
      socket.emit("game-details", updatedUsers, roomCode);
      setUsers(updatedUsers);
    }
  }, [accuracy, percentage, username, roomCode]);

  // Register socket event handler only once
  useEffect(() => {
    const handler = (newUsers) => {
      console.log("Received game details update:", newUsers);
      setUsers(newUsers);
    };

    socket.on("recieve-game-details", handler);

    return () => {
      socket.off("recieve-game-details", handler);
    };
  }, []);

  // Navigate to results when all users are done
  useEffect(() => {
    if (users.length > 0 && users.every((user) => user.completion >= 100)) {
      console.log("All users completed! Navigating to results...");
      setTimeout(() => {
        navigate(`/${roomCode}/results`, { state: { users } });
      }, 1000);
    }
  }, [users, navigate, roomCode]);

  const getColor = (num) => {
    if (num === -1) return "#666666"; // gray for untyped
    if (num === 0) return "#FF0000"; // red for incorrect
    return "#00FF00"; // green for correct
  };

  if (loading) return <p>Loading game details...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Game - Room: {roomCode}</h1>

      <div style={{ marginBottom: "20px" }}>
        <h2>Players ({users.length})</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {users.map((user, idx) => (
            <div
              key={idx}
              style={{
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
                backgroundColor:
                  user.username === username ? "#e3f2fd" : "transparent",
              }}
            >
              <strong>
                {user.username}
                {user.username === username && " (YOU)"}
              </strong>
              <div>
                Completion:{" "}
                {user.completion >= 100 ? " Completed" : `${user.completion}%`}
              </div>
              <div>Accuracy: {user.accuracy}%</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>Type this paragraph:</h2>
        <div
          style={{
            fontSize: "24px",
            lineHeight: "1.8",
            fontFamily: "monospace",
            backgroundColor: "#f5f5f5",
            padding: "20px",
            borderRadius: "5px",
            position: "relative",
          }}
        >
          {paragraph.map((el, i) => (
            <span
              key={i}
              style={{ color: getColor(el.valid), position: "relative" }}
            >
              {el.letter}
              {i === index && (
                <span
                  style={{
                    display: "inline-block",
                    width: "2px",
                    height: "1.2em",
                    backgroundColor: "#000",
                    marginLeft: "2px",
                    animation: "blink 1s steps(1) infinite",
                  }}
                  className="blinking-cursor"
                ></span>
              )}
            </span>
          ))}
          {/* Blinking cursor at the end if finished */}
          {index >= paragraph.length && (
            <span
              style={{
                display: "inline-block",
                width: "2px",
                height: "1.2em",
                backgroundColor: "#000",
                marginLeft: "2px",
                animation: "blink 1s steps(1) infinite",
              }}
              className="blinking-cursor"
            ></span>
          )}
        </div>
        <style>{`
          @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>

      <div style={{ fontSize: "18px", marginBottom: "10px" }}>
        <strong>Completion:</strong> {percentage}%
      </div>
      <div style={{ fontSize: "18px", marginBottom: "10px" }}>
        <strong>Accuracy:</strong> {accuracy}%
      </div>
      {percentage >= 100 && (
        <div
          style={{
            padding: "10px",
            backgroundColor: "#4caf50",
            color: "white",
            borderRadius: "5px",
            marginTop: "20px",
          }}
        >
          Completed! Waiting for others to finish...
        </div>
      )}
    </div>
  );
}
