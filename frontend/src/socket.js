import { io } from "socket.io-client";

// Create socket instance OUTSIDE of any component
const socket = io("http://localhost:4000", {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default socket;
