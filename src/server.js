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
    socket["nickname"] = "Anonymous";
    // console.log("Connected to Browser!", socket.url);
    socket.on("close", () => console.log("Disconnected from the Browser"));
    socket.on("message", (data) => {
        const parsedMsg = JSON.parse(data);
        // console.log(parsedMsg);
        switch(parsedMsg.type){
            case "message":
                sockets.forEach((socket_x) => {
                    if(socket.nickname !== socket_x.nickname){
                        socket_x.send(`${socket.nickname}: ${parsedMsg.payload}`);
                    }
                });
                break;
            case "nickname":
                socket["nickname"] = parsedMsg.payload;
                // console.log("user: ", socket.nickname);
                break;
        }
    });
});

server.listen(PORT, handleListen);

