import { io } from "socket.io-client";

// Create socket instance OUTSIDE of any component
const socket = io(window.location.origin, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  path: "/api/ws",
});

export default socket;
