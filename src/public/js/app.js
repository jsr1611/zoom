const socket = io();

const welcome = document.querySelector("#welcome");
const form = welcome.querySelector("form");
const room = document.getElementById("room");


room.hidden = true;

let roomName;




function addMessage(message){
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

function handleMessageSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#message input");
    const value = input.value;
    socket.emit("message", value, roomName, () => {
        addMessage(`You: ${value}`);
    });
    input.value = "";
}

function handleNicknameSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#nickname input");
    socket.emit("nickname", input.value);
}

function showRoom(){
    welcome.hidden = true;
    room.hidden = false;
    const roomTitle = room.querySelector("h3");
    roomTitle.innerText = `Room ${roomName}`;
    const msgForm = room.querySelector("#message");
    const nicknameForm = room.querySelector("#nickname");
    msgForm.addEventListener("submit", handleMessageSubmit);
    nicknameForm.addEventListener("submit", handleNicknameSubmit);
}

function handleRoomSubmit(event){
    event.preventDefault();
    const input = form.querySelector("input");
    socket.emit("enter_room", input.value, showRoom);
    roomName = input.value;
    input.value = "";
}


form.addEventListener("submit", handleRoomSubmit);


socket.on("welcome", (user, newCount) => {
    const roomTitle = room.querySelector("h3");
    roomTitle.innerText = `Room ${roomName} (${newCount})`;
    addMessage(`${user} joined!`);
});

socket.on("bye", (user, newCount) => {
    const roomTitle = room.querySelector("h3");
    roomTitle.innerText = `Room ${roomName} (${newCount})`;
    addMessage(`${user} left`);
});

socket.on("message", addMessage);

socket.on("room_change", (rooms) =>{
    const roomList = welcome.querySelector("ul");
    if(rooms.length === 0){
        roomList.innerHTML = "";
        return;
    }
    rooms.forEach((room) => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.appendChild(li);
    });
});