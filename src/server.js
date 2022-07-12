const express = require("express");
const WebSocket = require("ws");
const http = require("http");

const app = express();
const PORT = 3001;

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname+"/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const handleListen = () => console.log("Listening on http://localhost:" + PORT);

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });       // web socket server on top of http server

const sockets = [];

wss.on("connection", (socket) => {
    sockets.push(socket);
    console.log("Connected to Browser!", socket.url);
    socket.on("close", () => console.log("Disconnected from the Browser"));
    socket.on("message", (message) => {
        const msg = JSON.parse(message);
        if(msg.type === "message"){
            sockets.forEach((socket_x) => {
                socket_x.send(msg.payload);
            });
        }else if(msg.type === "nickname"){
            socket.name = msg.payload;
            console.log("user: ", socket.name);
        }
    });
});

server.listen(PORT, handleListen);

