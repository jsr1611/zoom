const socket = io();
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const videoBtn = document.getElementById("camera");
const cameraSelect = document.getElementById("cameras");

let myStream;
let muted = false;
let cameraOff = false;



async function getCameras(){
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === 'videoinput');
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            cameraSelect.appendChild(option);

        
        })
    } catch (error) {
        console.log(error);
    }
}



async function getMedia(){

    try {
        myStream = await navigator.mediaDevices.getUserMedia({
            audio:true,
            video:true,
        });
        myFace.srcObject = myStream;
        await getCameras();
    } catch (error) {
        console.log(error);
    }
}


getMedia();

function handleMuteClick(event){
    myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if(!muted){
        muteBtn.innerText = "Unmute";
        muted = true;
    }else{
        muteBtn.innerText = "Mute";
        muted = false;
    }
}

function handleCameraClick(event){
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
        
    if(!cameraOff){
        videoBtn.innerText = "Turn Camera On";
        cameraOff = true;
    }else{
        videoBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    }
}

function handleCameraChange(event){
    console.log(cameraSelect.value);
}

muteBtn.addEventListener("click", handleMuteClick);
videoBtn.addEventListener("click", handleCameraClick); 
cameraSelect.addEventListener("input", handleCameraChange);