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
    const baseAudioConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    };

    const initialConstraints = {
        audio: baseAudioConstraints,
        video: { facingMode: "user" },
    };

    const cameraConstraints = {
        audio: baseAudioConstraints,
        video: { deviceId: { exact: deviceId } },
    };

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


async function initCall() {
    welcome.classList.add("hidden");
    await new Promise((res) => setTimeout(res, 150));

    try {
        await getMedia();
        // If no peer yet, fill screen with my video only
        document.querySelector("#peerStream").style.display = "none";
        document.querySelector("#myStream").style.flex = "1";
        makeConnection();
        setTimeout(() => {
            call.classList.remove("hidden");
            document.body.style.background = "#000";
        }, 300);
    } catch (err) {
        alert("Camera access failed. Please allow permission and reload.");
        console.error(err);
    }
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
    document.body.classList.add("has-peer");
    console.log("📤 Sent offer");
    socket.emit("offer", offer, roomName);
});
socket.on("disconnect_peer", () => {
    document.body.classList.remove("has-peer");
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

socket.on("peer_left", () => {
    document.body.classList.remove("has-peer");
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
    document.getElementById("peerStream").style.display = "flex";
    document.getElementById("myStream").style.flex = "1";
    document.body.classList.add("has-peer");
}


// === Extra behavior: manual tap toggle on my video ===
if (window.innerWidth < 900) {
    const controls = document.querySelector(".controls");
    const myVideoArea = document.getElementById("myStream");

    let manualOverride = false; // track user toggle

    // Toggle manually
    function toggleControls() {
        const isHidden = controls.classList.contains("hidden-controls");

        if (isHidden) {
            // User shows controls
            controls.classList.remove("hidden-controls");
            document.body.classList.remove("controls-hidden");
            manualOverride = false; // reset after showing
        } else {
            // User hides controls
            controls.classList.add("hidden-controls");
            document.body.classList.add("controls-hidden");
            manualOverride = true;
        }
    }

    // Listen for taps on own video
    myVideoArea.addEventListener("touchstart", toggleControls);
    myVideoArea.addEventListener("click", toggleControls);

    // If auto-hide is running, only skip hiding when user explicitly hid controls
    document.body.addEventListener("touchstart", () => {
        if (!manualOverride) {
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                controls.classList.add("hidden-controls");
                document.body.classList.add("controls-hidden");
            }, 3000);
        }
    });
}



