const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { instrument } = require("@socket.io/admin-ui");

const app = express();
const PORT = 3000;
const rooms = {}; // { roomName: [socketIds] }

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/zoom", express.static(__dirname + "/public"));
app.get(["/zoom", "/zoom/"], (_, res) => res.render("home"));
app.get("/", (_, res) => res.redirect("/zoom"));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: { origin: ["https://admin.socket.io"], credentials: true },
    path: "/zoom/socket.io/"
});
instrument(io, { auth: false });

// Helper
function getAvailableRooms() {
    return Object.keys(rooms).filter((r) => rooms[r].length > 0);
}

// Broadcast to all connected clients
function broadcastRooms() {
    io.emit("rooms_list", getAvailableRooms());
}

io.on("connection", (socket) => {
    console.log("🔗 Connected:", socket.id);

    // Send current rooms immediately on connect
    socket.emit("rooms_list", getAvailableRooms());

    socket.on("join_room", (roomName) => {
        // Prevent more than 2 per room
        if (rooms[roomName] && rooms[roomName].length >= 2) {
            socket.emit("room_full", roomName);
            return;
        }

        socket.join(roomName);
        if (!rooms[roomName]) rooms[roomName] = [];
        rooms[roomName].push(socket.id);

        socket.to(roomName).emit("welcome");
        console.log(`📥 ${socket.id} joined room ${roomName}`);
        broadcastRooms();
    });

    socket.on("leave_room", (roomName) => {
        if (rooms[roomName]) {
            rooms[roomName] = rooms[roomName].filter((id) => id !== socket.id);
            if (rooms[roomName].length === 0) delete rooms[roomName];
        }
        socket.leave(roomName);
        console.log(`🚪 ${socket.id} left ${roomName}`);
        broadcastRooms();
    });

    socket.on("disconnect", () => {
        for (const room in rooms) {
            rooms[room] = rooms[room].filter((id) => id !== socket.id);
            if (rooms[room].length === 0) delete rooms[room];
        }
        console.log("❌ Disconnected:", socket.id);
        broadcastRooms();
    });

    // WebRTC signals
    socket.on("offer", (offer, roomName) => socket.to(roomName).emit("offer", offer));
    socket.on("answer", (answer, roomName) => socket.to(roomName).emit("answer", answer));
    socket.on("ice", (ice, roomName) => socket.to(roomName).emit("ice", ice));
});
httpServer.listen(PORT, () => console.log(`🚀 Listening on http://localhost:${PORT}`));
