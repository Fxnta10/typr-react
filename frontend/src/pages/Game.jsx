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
  const textRef = useRef(null);
  const [, setMessageSent] = useState([]);
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

      const tempMessageSent = res.data.users.map((u) => ({
        username: u.username,
        sent: false,
      }));
      setMessageSent(tempMessageSent);

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

      // Prevent page scroll/back navigation for typing keys
      if (
        key === " " ||
        key === "Spacebar" ||
        key === "Backspace" ||
        /^[a-zA-Z0-9 .,!?;:'"()-]$/.test(key)
      ) {
        e.preventDefault();
      }

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

  // Auto-scroll: keep the caret within the visible area
  useEffect(() => {
    if (!textRef.current) return;
    const caret = textRef.current.querySelector(".caret");
    if (caret) {
      caret.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [index, paragraph.length]);

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
  }, [accuracy, percentage, username, roomCode, users]);

  useEffect(() => {
    const handler = (newUsers) => {
      console.log("Received game details update:", newUsers);
      setUsers(newUsers);

      newUsers.forEach((user) => {
        setMessageSent((prev) => {
          // Find by username to be robust to ordering changes
          const idx = prev.findIndex((e) => e.username === user.username);
          const alreadySent = idx !== -1 && prev[idx]?.sent;

          if (
            user.completion === 100 &&
            !alreadySent &&
            username !== user.username
          ) {
            toast.success(`${user.username} has completed typing`);
            const updated = [...prev];
            if (idx === -1) {
              updated.push({ username: user.username, sent: true });
            } else {
              updated[idx] = { ...updated[idx], sent: true };
            }
            return updated;
          }
          return prev;
        });
      });
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

  const getClassForValidity = (v) => {
    if (v === -1) return "char-untyped";
    if (v === 0) return "char-incorrect";
    return "char-correct";
  };

  if (loading)
    return (
      <div className="container">
        <p className="status muted">Loading game details...</p>
      </div>
    );
  if (error)
    return (
      <div className="container">
        <p className="status error">Error: {error}</p>
      </div>
    );

  return (
    <div className="container game-layout">
      <h1>Room: {roomCode}</h1>

      <div className="players-section">
        <h2>Players ({users.length})</h2>
        <div className="user-strip">
          {users.map((user, idx) => (
            <div key={idx} className="user-pill">
              <span
                className={`name ${user.username === username ? "me" : ""}`}
              >
                {user.username}
                {user.username === username && " (YOU)"}
              </span>
              <span className="stat-badge">
                P: {user.completion >= 100 ? "100%" : `${user.completion}%`}
              </span>
              <span className="stat-badge">A: {user.accuracy}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-section">
        <h2>Type this paragraph</h2>
        <div className="game-area">
          <div className="game-text" ref={textRef}>
            {paragraph.map((el, i) => (
              <span key={i} className={`char ${getClassForValidity(el.valid)}`}>
                {i === index && <span className="caret" />}
                {el.letter}
              </span>
            ))}
            {index >= paragraph.length && (
              <span
                className="char char-untyped"
                style={{ display: "inline-block", width: 0 }}
              >
                <span className="caret" />
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="stats" style={{ marginTop: "1rem" }}>
        <div className="stat">
          <span className="value">{percentage}%</span>
          <span className="label">Completion</span>
        </div>
        <div className="stat">
          <span className="value">{accuracy}%</span>
          <span className="label">Accuracy</span>
        </div>
      </div>

      {percentage >= 100 && (
        <p className="status success" style={{ marginTop: "1rem" }}>
          Completed! Waiting for others to finish...
        </p>
      )}
    </div>
  );
}
