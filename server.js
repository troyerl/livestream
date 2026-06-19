const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

// Serve frontend files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Global state tracking for sync
let streamState = {
  video1: "5qap5aO4i9A", // Default fallback YouTube Video IDs (Change these to your streams!)
  video2: "DWcJYXZMnbc",
  isAdminSynced: false,
  lastKnownTime1: 0,
  lastKnownTime2: 0,
  playing: false,
};

io.on("connection", (socket) => {
  // 1. Send current stream state to newly joined browsers
  socket.emit("initial-state", streamState);

  // 2. Listen for Admin changing stream IDs
  socket.on("admin-change-streams", (data) => {
    streamState.video1 = data.video1 || streamState.video1;
    streamState.video2 = data.video2 || streamState.video2;
    io.emit("streams-updated", streamState);
  });

  // 3. Listen for Admin triggering a synchronization signal
  socket.on("admin-sync-command", (data) => {
    streamState.lastKnownTime1 = data.time1;
    streamState.lastKnownTime2 = data.time2;
    streamState.playing = data.playing;
    streamState.isAdminSynced = data.isAdminSynced;

    // Broadcast the exact timestamp targeting all viewer clients
    socket.broadcast.emit("force-client-sync", streamState);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Synchronization engine humming on port ${PORT}`);
});
