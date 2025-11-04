import { useLocation, useParams } from "react-router-dom";

export default function Result() {
  const { roomCode } = useParams();
  const location = useLocation();
  const { users } = location.state;

  const sortedUsers = [...users].sort((a, b) => b.accuracy - a.accuracy);

  return (
    <div>
      <h2>Results for Room: {roomCode}</h2>
      {sortedUsers.map((user, index) => (
        <div key={index}>
          {index} {user.username} — Accuracy: {user.accuracy}%
        </div>
      ))}
    </div>
  );
}
