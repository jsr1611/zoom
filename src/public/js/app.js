const messageList = document.querySelector("ul");
const nicknameForm = document.querySelector("#nick");
const messageForm = document.querySelector("#message");
const socket = new WebSocket(`ws://${window.location.host}`);



function makeMessage(type, payload){
    const msg = {type, payload};
    return JSON.stringify(msg);
}

socket.addEventListener("open", () => {
    console.log("Connected to Server!");
});

socket.addEventListener("message", (message) => {
    console.log(message.data);
    const li = document.createElement("li");
    
    li.innerText = message.data;
    messageList.appendChild(li);
});

socket.addEventListener("close", () => {
    console.log("Disconnected from Server!");
});

socket.addEventListener("error", (err) => {
    console.log(err);
})

function handleSubmit(event){
    event.preventDefault();
    const input = messageForm.querySelector("input");
    socket.send(makeMessage("message", input.value));
    input.value = "";
}


function handleNickSubmit(event){
    event.preventDefault();
    const input = nicknameForm.querySelector("input");
    socket.send(makeMessage("nickname", input.value));
}


messageForm.addEventListener("submit", handleSubmit);
nicknameForm.addEventListener("submit", handleNickSubmit);