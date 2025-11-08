const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { instrument } = require("@socket.io/admin-ui");


const app = express();
const PORT = 3000;

// View + static setup
app.set("view engine", "pug");
app.set("views", __dirname + "/views");

app.use("/zoom", express.static(__dirname + "/public"));
app.get("/zoom/health", (_, res) => res.status(200).send("OK"));
app.get(["/zoom", "/zoom/"], (_, res) => res.render("home"));
app.get("/", (_, res) => res.redirect("/zoom"));



// HTTP + Socket.io
const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
    },
    path: "/zoom/socket.io/"
});
instrument(wsServer, { auth: false });


// Socket.io connection
wsServer.on("connection", (socket) => {
    console.log("🔗 Connected:", socket.id);

    socket.on("join_room", (roomName) => {
        socket.join(roomName);
        socket.to(roomName).emit("welcome");
        console.log(`📥 ${socket.id} joined room ${roomName}`);
    });

    socket.on("offer", (offer, roomName) => {
        socket.to(roomName).emit("offer", offer);
    });

    socket.on("answer", (answer, roomName) => {
        socket.to(roomName).emit("answer", answer);
    });

    socket.on("ice", (ice, roomName) => {
        socket.to(roomName).emit("ice", ice);
    });

    socket.on("disconnect", () => {
        console.log("❌ Disconnected:", socket.id);
    });
});

// run the server
const handleListen = () => console.log("Listening on http://localhost:" + PORT);
httpServer.listen(PORT, handleListen);

