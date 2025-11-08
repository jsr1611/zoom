// ✅ Connect to correct Socket.IO path
const socket = io({
    path: "/zoom/socket.io/",
});

socket.on("connect", () => {
    console.log("✅ Connected to Socket.IO server:", socket.id);
});

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const videoBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");
const call = document.getElementById("call");
const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

call.classList.add("hidden"); // hide video area before joining

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

// 🎥 Media setup
async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameraSelect.innerHTML = "";
        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label === camera.label) option.selected = true;
            cameraSelect.appendChild(option);
        });
    } catch (error) {
        console.log(error);
    }
}

async function getMedia(deviceId) {
    const initialConstraints = { audio: true, video: { facingMode: "user" } };
    const cameraConstraints = { audio: true, video: { deviceId: { exact: deviceId } } };
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstraints : initialConstraints
        );
        myFace.srcObject = myStream;
        if (!deviceId) await getCameras();
    } catch (error) {
        console.log(error);
    }
}

muteBtn.addEventListener("click", () => {
    myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    muteBtn.innerText = muted ? "Mute" : "Unmute";
    muted = !muted;
});

videoBtn.addEventListener("click", () => {
    myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    videoBtn.innerText = cameraOff ? "Turn Camera Off" : "Turn Camera On";
    cameraOff = !cameraOff;
});

cameraSelect.addEventListener("input", async () => {
    await getMedia(cameraSelect.value);
    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSenders()
            .find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
});


// 🧩 Room join logic
async function initCall() {
    welcome.classList.add("hidden");
    await getMedia();
    makeConnection();
    setTimeout(() => {
        call.classList.remove("hidden");
    }, 300);
}


welcomeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    roomName = input.value.trim();
    if (!roomName) return;
    document.getElementById("roomLabel").textContent = `Room: ${roomName}`;
    document.getElementById("roomLabel").classList.remove("hidden");

    console.log("🎯 Joining room:", roomName);
    await initCall();
    socket.emit("join_room", roomName);
    input.value = "";
});

// 🔗 Signaling
socket.on("welcome", async () => {
    console.log("👋 Someone joined the room");
    const offer = await myPeerConnection.createOffer();
    await myPeerConnection.setLocalDescription(offer);
    console.log("📤 Sent offer");
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
    console.log("📨 Received offer");
    await myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    await myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("📤 Sent answer");
});

socket.on("answer", async (answer) => {
    console.log("📨 Received answer");
    await myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", async (ice) => {
    console.log("📨 Received ICE candidate");
    await myPeerConnection.addIceCandidate(ice);
});

// 🧠 WebRTC setup
function makeConnection() {
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
            },
        ],
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(event) {
    if (event.candidate) {
        console.log("📤 Sent ICE candidate");
        socket.emit("ice", event.candidate, roomName);
    }
}

function handleAddStream(event) {
    console.log("✅ Remote stream received");
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = event.stream;
}

// === Mobile PiP drag (active only on mobile) ===
if (window.innerWidth < 900) {
    const myStreamEl = document.getElementById("myStream");
    let offsetX = 0, offsetY = 0;

    myStreamEl.addEventListener("touchstart", (e) => {
        const touch = e.touches[0];
        offsetX = touch.clientX - myStreamEl.getBoundingClientRect().left;
        offsetY = touch.clientY - myStreamEl.getBoundingClientRect().top;
    });

    myStreamEl.addEventListener("touchmove", (e) => {
        const touch = e.touches[0];
        myStreamEl.style.left = `${touch.clientX - offsetX}px`;
        myStreamEl.style.top = `${touch.clientY - offsetY}px`;
        myStreamEl.style.bottom = "auto";
        myStreamEl.style.right = "auto";
    });

    // optional: limit dragging inside screen
    window.addEventListener("resize", () => {
        myStreamEl.style.left = "";
        myStreamEl.style.top = "";
        myStreamEl.style.bottom = "1rem";
        myStreamEl.style.right = "1rem";
    });
}
// === Auto-hide controls on mobile (like Zoom / FaceTime) ===
if (window.innerWidth < 900) {
    const controls = document.querySelector(".controls");
    let hideTimeout;

    function showControls() {
        controls.classList.remove("hidden-controls");
        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            controls.classList.add("hidden-controls");
        }, 3000); // hide after 3 seconds
    }

    // Show controls on tap anywhere
    document.body.addEventListener("touchstart", showControls);
    document.body.addEventListener("click", showControls);

    // Start hidden after 3s of load
    hideTimeout = setTimeout(() => {
        controls.classList.add("hidden-controls");
    }, 3000);
}


