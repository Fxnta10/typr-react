import { useLocation, useParams, useNavigate } from "react-router-dom";

export default function Result() {
  const { roomCode } = useParams();
  const location = useLocation();
  const { users } = location.state;
  const navigate = useNavigate();

  const sortedUsers = [...users].sort((a, b) => b.accuracy - a.accuracy);

  return (
    <div className="container">
      <h1>Results — Room: {roomCode}</h1>
      <div className="results-container">
        {sortedUsers.map((user, index) => (
          <div key={index} className="result-item">
            <div>
              <strong>{index + 1}.</strong> {user.username}
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              {user.accuracy}% accuracy
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <button className="btn" onClick={() => navigate(`/${roomCode}/lobby`)}>
          Back to Lobby
        </button>
        <button className="btn" onClick={() => navigate(`/${roomCode}/game`)}>
          Rematch
        </button>
      </div>
    </div>
  );
}
