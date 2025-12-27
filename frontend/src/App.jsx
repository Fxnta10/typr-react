import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import LoginPage from "./pages/LoginPage";
import Lobby from "./pages/Lobby";
import Game from "./pages/Game";
import Result from "./pages/Result";
import CreateRoom from "./pages/CreateRoom";
function App() {
  return (
    <>
      <Toaster position="top-right" />

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/create" element={<CreateRoom />} />
          <Route path="/:roomCode/lobby" element={<Lobby />} />
          <Route path="/:roomCode/game" element={<Game />} />
          <Route path="/:roomCode/results" element={<Result />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
