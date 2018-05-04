var localVideo;
var localStream;
var remoteVideo;
var peerConnection;
var uuid;
var serverConnection;
var recorder;
var request;

var peerConnectionConfig = {
  iceServers: [
    {
      urls: "stun:stun.stunprotocol.org:3478"
    },
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};

function pageReady() {
  uuid = createUUID();

  document.getElementById("peer-id-label").innerHTML = uuid;

  defineCanvasDesenho();

  localVideo = document.getElementById("localVideo");
  remoteVideo = document.getElementById("remoteVideo");

  serverConnection = new WebSocket(
    // "wss://" + window.location.hostname + ":8443"
    "wss://" + "172.16.22.119" + ":9000/" + uuid
  );
  serverConnection.onmessage = gotMessageFromServer;

  var constraints = {
    video: true,
    audio: true
  };

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(getUserMediaSuccess)
      .catch(errorHandler);
  } else {
    alert("Your browser does not support getUserMedia API");
  }
}

function getUserMediaSuccess(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
}

function start(isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = gotRemoteStream;
  peerConnection.addStream(localStream);

  if (isCaller) {
    peerConnection
      .createOffer()
      .then(createdDescription)
      .catch(errorHandler);
  }
}

function gotMessageFromServer(message) {
  
  if (!peerConnection) start(false);

  if (!message.data) return;

  var _data = JSON.parse(message.data);

  // Ignore messages from ourself
  if (_data.uuid == uuid) return;

  if (!request) request = _data.uuid;

  switch (_data.type) {
    case "CREATE_DESCRIPTION":
      receivedSDP(_data);
      break;
    case "ICE_CANDIDATE":
      receivedSDP(_data);
      break;
    case "DRAW_CANVAS":
      desenharPontos(_data);
      break;
    case "CLEAN_CANVAS":
      limparDadosCanvas(_data);
      break;
    default:
      break;
  }
}

function receivedSDP(signal) {
  if (signal.sdp) {
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(signal.sdp))
      .then(function() {
        // Only create answers in response to offers
        if (signal.sdp.type == "offer") {
          peerConnection
            .createAnswer()
            .then(createdDescription)
            .catch(errorHandler);
        }
      })
      .catch(errorHandler);
  }
}

function receivedIceCandidate(signal) {
  if (signal.ice) {
    peerConnection
      .addIceCandidate(new RTCIceCandidate(signal.ice))
      .catch(errorHandler);
  }
}

function gotIceCandidate(event) {

  if (!request) request = document.getElementById("other-id").value;

  if (event.candidate != null) {
    serverConnection.send(
      JSON.stringify({
        type: "ICE_CANDIDATE",
        request: Number(request),
        ice: event.candidate,
        uuid: uuid
      })
    );
  }
}

function createdDescription(description) {
  console.log("got description");

  if (!request) request = document.getElementById("other-id").value;

  peerConnection
    .setLocalDescription(description)
    .then(function() {
      serverConnection.send(
        JSON.stringify({
          type: "CREATE_DESCRIPTION",
          sdp: peerConnection.localDescription,
          uuid: uuid,
          request: Number(request)
        })
      );
    })
    .catch(errorHandler);
}

function gotRemoteStream(event) {
  
  console.log("got remote stream");
  var stream = event.streams[0];
  remoteVideo.srcObject = stream;

  var mixer = new MultiStreamsMixer([stream, localStream]);

  mixer.frameInterval = 1;
  mixer.startDrawingFrames();

  recorder = RecordRTC(mixer.getMixedStream(), {
    type: "video",
    recorderType: MediaStreamRecorder || CanvasRecorder || StereoAudioRecorder
  });
}

function errorHandler(error) {
  console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  return Math.floor(Math.random() * 1000) + 1;
}

function gravarVideo() {
  recorder.startRecording();
  document.getElementById("btn-stop-gravacao").removeAttribute("disabled");
}

function pararGravacao() {
  document
    .getElementById("btn-stop-gravacao")
    .setAttribute("disabled", "disabled");
  recorder.stopRecording(function(url) {
    downloadVideo(url);
  });
}

function downloadVideo(blobUrl) {
  var xhr = new XMLHttpRequest();
  xhr.responseType = "blob";

  xhr.onload = function() {
    var recoveredBlob = xhr.response;
    var reader = new FileReader();
    saveAs(xhr.response, "teste.webm");
  };

  xhr.open("GET", blobUrl);
  xhr.send();
}

function defineCanvasDesenho() {
  var canvas_camera = document.getElementById("canvas-camera");
  var ctx = canvas_camera.getContext("2d"),
    points = [],
    isDown = false,
    prevX,
    prevY;

  canvas_camera.onmousedown = function(e) {
    var pos = getXY(e);

    prevX = pos.x;
    prevY = pos.y;

    /// add new stroke
    points.push([]);

    /// record point in this stroke
    points[points.length - 1].push([pos.x, pos.y]);

    isDown = true;
  };

  canvas_camera.onmousemove = function(e) {
    if (!isDown) return;

    var pos = getXY(e);

    ctx.lineWidth = 4;
    ctx.strokeStyle = "#FF0000";
    ctx.fillStyle = "transparent";
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.font = '15px "Arial"';

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    prevX = pos.x;
    prevY = pos.y;

    points[points.length - 1].push([pos.x, pos.y]);
  };

  canvas_camera.onmouseup = function() {
    
    isDown = false;

    if (!request) request = document.getElementById("other-id").value;
    console.log(JSON.stringify(points));
    serverConnection.send(
      JSON.stringify({
        type: "DRAW_CANVAS",
        request: Number(request),
        points: points,
        uuid: uuid
      })
    );
  };

  function getXY(e) {
    var r = canvas_camera.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top
    };
  }
}

function desenharPontos(data) {
  points = data.points;
  var canvas_other = document.getElementById("canvas-camera");
  var ctx_other = canvas_other.getContext("2d");
  ctx_other.clearRect(0, 0, canvas_other.width, canvas_other.height);

  ctx_other.lineWidth = 4;
  ctx_other.strokeStyle = "#FF0000";
  ctx_other.fillStyle = "transparent";
  ctx_other.globalAlpha = 1;
  ctx_other.globalCompositeOperation = "source-over";
  ctx_other.lineCap = "round";
  ctx_other.lineJoin = "round";
  ctx_other.font = '15px "Arial"';

  /// get a stroke
  for (var i = 0, t, p, pts; (pts = points[i]); i++) {
    /// render stroke
    ctx_other.beginPath();
    ctx_other.moveTo(pts[0][0], pts[0][1]);
    for (t = 1; (p = pts[t]); t++) {
      ctx_other.lineTo(p[0], p[1]);
    }
    ctx_other.stroke();
  }
}

function limparPontos() {
  limparDadosCanvas();
  serverConnection.send(
    JSON.stringify({
      type: "CLEAN_CANVAS",
      request: Number(request),
      uuid: uuid
    })
  );
}

function limparDadosCanvas() {
  var canvas_other = document.getElementById("canvas-camera");
  var ctx_other = canvas_other.getContext("2d");
  ctx_other.clearRect(0, 0, canvas_other.width, canvas_other.height);
  points = [];
}
