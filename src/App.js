import { useEffect, useRef, useState } from "react";

function App() {
  const [startButtonDisabled, setStartButtonDisabled] = useState(false);
  const [callButtonDisabled, setCallButtonDisabled] = useState(true);
  const [hangupButtonDisabled, setHangupButtonDisabled] = useState(true);
  const [pc1Local, setPc1Local] = useState(undefined);
  const [pc2Local, setPc2Local] = useState(undefined);
  const [pc1Remote, setPc1Remote] = useState(undefined);
  const [pc2Remote, setPc2Remote] = useState(undefined);

  const video1Ref = useRef(null);
  const video2Ref = useRef(null);
  const video3Ref = useRef(null);

  const offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1,
  };

  function gotStream(stream) {
    const video1 = video1Ref.current;
    console.log("Received local stream");
    video1.srcObject = stream;
    window.localStream = stream;
    setCallButtonDisabled(false);
  }

  function start() {
    console.log("Requesting local stream");
    setStartButtonDisabled(true);
    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: true,
      })
      .then(gotStream)
      .catch((e) => console.log("getUserMedia() error: ", e));
  }

  async function call() {
    setCallButtonDisabled(true);
    setHangupButtonDisabled(false);
    console.log("Starting calls");
    const audioTracks = window.localStream.getAudioTracks();
    const videoTracks = window.localStream.getVideoTracks();
    if (audioTracks.length > 0) {
      console.log(`Using audio device: ${audioTracks[0].label}`);
    }
    if (videoTracks.length > 0) {
      console.log(`Using video device: ${videoTracks[0].label}`);
    }
    // Create an RTCPeerConnection via the polyfill.
    const servers = null;

    const newPc1Local = new RTCPeerConnection(servers);
    const newPc1Remote = new RTCPeerConnection(servers);

    const newPc2Local = new RTCPeerConnection(servers);
    const newPc2Remote = new RTCPeerConnection(servers);

    setPc1Local(newPc1Local);
    setPc1Remote(newPc1Remote);
    setPc2Local(newPc2Local);
    setPc2Remote(newPc2Remote);

    function iceCallback1Local(event) {
      handleCandidate(event.candidate, newPc1Remote, "pc1: ", "local");
    }

    function iceCallback1Remote(event) {
      handleCandidate(event.candidate, newPc1Local, "pc1: ", "remote");
    }

    function iceCallback2Local(event) {
      handleCandidate(event.candidate, newPc2Remote, "pc2: ", "local");
    }

    function iceCallback2Remote(event) {
      handleCandidate(event.candidate, newPc2Local, "pc2: ", "remote");
    }

    newPc1Remote.ontrack = gotRemoteStream1;
    newPc1Local.onicecandidate = iceCallback1Local;

    newPc1Remote.onicecandidate = iceCallback1Remote;
    console.log("pc1: created local and remote peer connection objects");

    newPc2Remote.ontrack = gotRemoteStream2;
    newPc2Local.onicecandidate = iceCallback2Local;
    newPc2Remote.onicecandidate = iceCallback2Remote;
    console.log("pc2: created local and remote peer connection objects");

    window.localStream
      .getTracks()
      .forEach((track) => newPc1Local.addTrack(track, window.localStream));
    console.log("Adding local stream to pc1Local");
    const offer = await newPc1Local.createOffer(offerOptions);
    gotDescription1Local(offer, newPc1Local, newPc1Remote);

    const offer2 = await newPc2Local.createOffer(offerOptions);
    gotDescription2Local(offer2, newPc2Local, newPc2Remote);

    window.localStream
      .getTracks()
      .forEach((track) => newPc2Local.addTrack(track, window.localStream));
    console.log("Adding local stream to pc2Local");
  }

  function onCreateSessionDescriptionError(error) {
    console.log(`Failed to create session description: ${error.toString()}`);
  }

  async function gotDescription1Local(desc, pc1Local, pc1Remote) {
    pc1Local.setLocalDescription(desc);
    console.log(`Offer from pc1Local\n${desc.sdp}`);
    pc1Remote.setRemoteDescription(desc);
    // Since the 'remote' side has no media stream we need
    // to pass in the right constraints in order for it to
    // accept the incoming offer of audio and video.
    const answer = await pc1Remote.createAnswer();
    gotDescription1Remote(answer, pc1Local, pc1Remote);
  }

  async function gotDescription1Remote(desc, pc1Local, pc1Remote) {
    pc1Remote.setLocalDescription(desc);
    console.log(`Answer from pc1Remote\n${desc.sdp}`);
    pc1Local.setRemoteDescription(desc);
  }

  async function gotDescription2Local(desc, pc2Local, pc2Remote) {
    pc2Local.setLocalDescription(desc);
    console.log(`Offer from pc2Local\n${desc.sdp}`);
    pc2Remote.setRemoteDescription(desc);
    // Since the 'remote' side has no media stream we need
    // to pass in the right constraints in order for it to
    // accept the incoming offer of audio and video.
    const answer = await pc2Remote.createAnswer();

    gotDescription2Remote(answer, pc2Local, pc2Remote);
  }

  async function gotDescription2Remote(desc, pc2Local, pc2Remote) {
    pc2Remote.setLocalDescription(desc);
    console.log(`Answer from pc2Remote\n${desc.sdp}`);
    pc2Local.setRemoteDescription(desc);
  }

  function hangup() {
    console.log("Ending calls");
    console.log(pc1Local);
    console.log(pc1Remote);
    pc1Local.close();
    pc1Remote.close();
    pc2Local.close();
    pc2Remote.close();
    setPc1Local(undefined);
    setPc1Remote(undefined);
    setPc2Local(undefined);
    setPc2Remote(undefined);
    setHangupButtonDisabled(true);
    setCallButtonDisabled(false);
  }

  function gotRemoteStream1(e) {
    const video2 = video2Ref.current;
    if (video2.srcObject !== e.streams[0]) {
      video2.srcObject = e.streams[0];
      console.log("pc1: received remote stream");
    }
  }

  function gotRemoteStream2(e) {
    const video3 = video3Ref.current;
    if (video3.srcObject !== e.streams[0]) {
      video3.srcObject = e.streams[0];
      console.log("pc2: received remote stream");
    }
  }

  function handleCandidate(candidate, dest, prefix, type) {
    dest
      .addIceCandidate(candidate)
      .then(onAddIceCandidateSuccess, onAddIceCandidateError);
    console.log(
      `${prefix}New ${type} ICE candidate: ${
        candidate ? candidate.candidate : "(null)"
      }`
    );
  }

  function onAddIceCandidateSuccess() {
    console.log("AddIceCandidate success.");
  }

  function onAddIceCandidateError(error) {
    console.log(`Failed to add ICE candidate: ${error.toString()}`);
  }

  useEffect(() => {
    console.log(pc1Local);
    console.log(pc2Local);
    console.log(pc1Remote);
    console.log(pc2Remote);
  }, [pc1Local, pc1Remote, pc2Local, pc2Remote]);

  return (
    <div id="container">
      <h1>
        <a href="//webrtc.github.io/samples/" title="WebRTC samples homepage">
          WebRTC samples
        </a>{" "}
        <span>Multiple peer connections</span>
      </h1>

      <video id="video1" playsInline autoPlay muted ref={video1Ref}></video>
      <video id="video2" playsInline autoPlay ref={video2Ref}></video>
      <video id="video3" playsInline autoPlay ref={video3Ref}></video>

      <div>
        <button id="startButton" disabled={startButtonDisabled} onClick={start}>
          Start
        </button>
        <button id="callButton" disabled={callButtonDisabled} onClick={call}>
          Call
        </button>
        <button
          id="hangupButton"
          disabled={hangupButtonDisabled}
          onClick={hangup}
        >
          Hang Up
        </button>
      </div>

      <p>
        View the console to see logging and to inspect the{" "}
        <code>MediaStream</code> object <code>localStream</code>.
      </p>

      <p>
        For more information about RTCPeerConnection, see{" "}
        <a
          href="http://www.html5rocks.com/en/tutorials/webrtc/basics/"
          title="HTML5 Rocks article about WebRTC by Sam Dutton"
        >
          Getting Started With WebRTC
        </a>
        .
      </p>

      <a
        href="https://github.com/webrtc/samples/tree/gh-pages/src/content/peerconnection/multiple"
        title="View source for this page on GitHub"
        id="viewSource"
      >
        View source on GitHub
      </a>
    </div>
  );
}

export default App;
