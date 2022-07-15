const express = require("express");
const WebSocket = require("ws");
const http = require("http");
const Server = require("socket.io");
const {instrument} = require("@socket.io/admin-ui");


const app = express();
const PORT = 3001;

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname+"/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));



const httpServer = http.createServer(app);
const wsServer = Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
    },
});

instrument(wsServer, {
    auth: false,
});

function publicRooms(){
    // const sids = wsServer.sockets.adapter.sids;
    // const rooms = wsServer.sockets.adapter.rooms;
    const {
        sockets:{
            adapter:{sids, rooms},
        },
    } = wsServer;
    const publicRooms = [];
    rooms.forEach((_, key) =>{
        if(sids.get(key) === undefined){
            publicRooms.push(key);
        }
    });
    return publicRooms;
}

function countRoom(roomName){
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}



wsServer.on("connection", socket => {
    // console.log(socket);
    socket["nickname"] = "Anonymous";
    socket.onAny((event) => {
        console.log(wsServer.sockets.adapter);
        //console.log(`Socket Event: ${event}`);
        console.log(socket.nickname);
    });

    socket.on("enter_room", (room, done) => {
        socket.join(room); 
        done();
        socket.to(room).emit("welcome", socket.nickname, countRoom(room));

        wsServer.sockets.emit("room_change", publicRooms());
    });

    socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => {
            socket.to(room).emit("bye", socket.nickname, countRoom(room)-1);            
        });
        
    });

    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
    });

    socket.on("message", (msg, room, done) => {
        socket.to(room).emit("message", `${socket.nickname}: ${msg}`);
        done();
    });

    socket.on("nickname", (nickname) => socket["nickname"] = nickname)
    
});


// const sockets = [];
// const wss = new WebSocket.Server({ server });       // web socket server on top of http server
// wss.on("connection", (socket) => {
//     sockets.push(socket);
//     socket["nickname"] = "Anonymous";
//     // console.log("Connected to Browser!", socket.url);
//     socket.on("close", () => console.log("Disconnected from the Browser"));
//     socket.on("message", (data) => {
//         const parsedroomName = JSON.parse(data);
//         // console.log(parsedroomName);
//         switch(parsedroomName.type){
//             case "message":
//                 sockets.forEach((socket_x) => {
//                     if(socket.nickname !== socket_x.nickname){
//                         socket_x.send(`${socket.nickname}: ${parsedroomName.payload}`);
//                     }
//                 });
//                 break;
//             case "nickname":
//                 socket["nickname"] = parsedroomName.payload;
//                 // console.log("user: ", socket.nickname);
//                 break;
//         }
//     });
// });

const handleListen = () => console.log("Listening on http://localhost:" + PORT);
httpServer.listen(PORT, handleListen);

