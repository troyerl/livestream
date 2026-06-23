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
  video1: "5qap5aO4i9A", // Default fallback YouTube Video IDs
  video2: "DWcJYXZMnbc",
  lastKnownTime1: 0,
  lastKnownTime2: 0,
};

io.on("connection", (socket) => {
  // Send current stream state to newly joined browsers (Viewers or Admin)
  socket.emit("initial-state", streamState);

  // Listen for Admin changing stream IDs
  socket.on("admin-change-streams", (data) => {
    streamState.video1 = data.video1 || streamState.video1;
    streamState.video2 = data.video2 || streamState.video2;
    // Tell everyone (including viewers) to load the new video feeds
    io.emit("streams-updated", streamState);
  });

  // Listen for Admin triggering a synchronization signal
  socket.on("admin-sync-command", (data) => {
    streamState.lastKnownTime1 = data.time1;
    streamState.lastKnownTime2 = data.time2;

    // Broadcast the exact timestamps to all viewer clients
    io.emit("force-client-sync", streamState);
  });

  // Listen for Admin requesting a playback delay on a given stream
  socket.on("admin-delay-stream", (data) => {
    const stream = data.stream === 2 ? 2 : 1;
    const seconds = Number(data.seconds) > 0 ? Number(data.seconds) : 3;

    // Tell every viewer to push the chosen stream back by `seconds`
    io.emit("force-client-delay", { stream, seconds });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Synchronization engine humming on port ${PORT}`);
});
