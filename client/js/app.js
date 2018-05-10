var localVideo;
var localStream;
var remoteVideo;
var peerConnection;
var socket;
var recorder;
var request;
const peerConnectionConfig = {
  iceServers: [{
      urls: "stun:stun.stunprotocol.org:3478"
    },
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};



(function (angular) {
  "use strict";
  var myApp = angular.module("app", []);

  myApp.controller("QuestionarioController", [
    "$scope",
    function ($scope) {

      var ctrl = this;
      var points = [];

      ctrl.uuid;
      $scope.chamada_iniciada = false;
      ctrl.anexos = [];

      ctrl.questoes = [{
          titulo: "Questão 1",
          tipo: "Text"
        },
        {
          titulo: "Questão 2",
          tipo: "Select"
        },
        {
          titulo: "Questão 3",
          tipo: "Gravacao",
          documentos: []
        },
        {
          titulo: "Questão 4",
          tipo: "Text"
        },
        {
          titulo: "Questão 5",
          tipo: "Gravacao",
          documentos: []
        },
        {
          titulo: "Questão 6",
          tipo: "Text"
        }
      ];

      //all your init controller goodness in here
      ctrl.onInit = function () {

        localVideo = document.getElementById("localVideo");
        remoteVideo = document.getElementById("remoteVideo");
        ctrl.uuid = createUUID();

        defineCanvasDesenho();
        criarSocket();
        criaChamadaLocal();

      };

      ctrl.encerrarChamada = function () {

        //Emite evento de desenho
        enviarDadosSocket('call:end', {
          request: Number(request),
          uuid: ctrl.uuid
        })

        encerrarChamada();

      };

      ctrl.limparPontos = function () {

        //Limpa os campos do canvas
        limparDadosCanvas();

        //Chama Método de Limpar pontos
        enviarDadosSocket('canvas:clean', {
          request: Number(request),
          uuid: ctrl.uuid
        })

      };

      ctrl.abrirDocumentos = function (pergunta) {
        ctrl.anexos = pergunta.documentos;
        $("#anexos-perguntas").modal("show");
      };

      ctrl.tirarPrint = function (questao) {

        var video = document.getElementById("remoteVideo");
        var canvas_print = document.getElementById("canvas-print");

        //Animation do print
        angular.element("#remoteVideo").animate({
            opacity: 0.3
          },
          function () {
            //call when the animation is complete
            angular.element("#remoteVideo").animate({
              opacity: 1
            });
          }
        );

        canvas_print.height = video.height;
        canvas_print.width = video.width;

        var ctx = canvas_print.getContext("2d");
        ctx.drawImage(video, 0, 0, video.width, video.height);

        var dataURL = ctx.canvas.toBlob(function (blob) {
          questao.documentos.push({
            type: "Imagem",
            src: blob
          });
          $scope.$apply();
        });
      };

      ctrl.gravarVideo = function (questao) {
        questao.gravando = true;
        recorder.startRecording();
      };

      ctrl.pararGravacao = function (questao) {
        questao.gravando = false;
        recorder.stopRecording(function (url) {
          questao.documentos.push({
            type: "Video",
            src: url
          });
          $scope.$apply();
        });
      };

      ctrl.downloadVideo = function (url) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = "blob";

        xhr.onload = function () {
          var recoveredBlob = xhr.response;
          var reader = new FileReader();
          saveAs(xhr.response, "teste.webm");
        };

        xhr.open("GET", url);
        xhr.send();
      };

      ctrl.downloadImagem = function (blob) {
        saveAs(blob, "image.png");
      };

      ctrl.start = function () {
        changeCallStatus(true);
        start(true);
      }

      function start(isCaller) {

        changeCallStatus(true);

        peerConnection = new RTCPeerConnection(peerConnectionConfig);
        peerConnection.onicecandidate = gotIceCandidate;
        peerConnection.ontrack = gotRemoteStream;
        peerConnection.onremovestream = stop;
        peerConnection.addStream(localStream);

        if (isCaller) {
          peerConnection
            .createOffer()
            .then(createdDescription)
            .catch(errorHandler);
        }
      }

      function getUserMediaSuccess(stream) {
        localStream = stream;
        localVideo.srcObject = stream;
      }

      function receivedSDP(signal) {
        if (signal.sdp) {
          peerConnection
            .setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .then(function () {
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

        if (event.candidate != null) {

          //Notifica o inicio da chamada
          enviarDadosSocket("call:ICECandidate", {
            request: Number(request),
            ice: event.candidate,
            uuid: ctrl.uuid
          });

        }

      }

      function enviarDadosSocket(eventName, dados) {

        if (!request)
          alert("Chamada não encontrada")

        //Notifica o inicio da chamada
        socket.emit(eventName, dados);

      }

      function createdDescription(description) {
        console.log("got description");

        peerConnection
          .setLocalDescription(description)
          .then(function () {

            //Notifica o inicio da chamada
            enviarDadosSocket("call:start", {
              sdp: peerConnection.localDescription,
              uuid: ctrl.uuid,
              request: Number(request)
            });



          })
          .catch(errorHandler);
      }

      function gotRemoteStream(event) {
        console.log("got remote stream");

        var stream = event.streams[0];
        remoteVideo.srcObject = stream;

        // var mixer = new MultiStreamsMixer([stream, localStream]);

        // mixer.frameInterval = 1;
        // mixer.startDrawingFrames();

        //Faz a mescla dos streams para salvar com os dois áudios
        recorder = RecordRTC([stream, localStream], {
          type: "video",
          //audioBitsPerSecond: 192000,
          // video: {
          //     width: 300,
          //     height: 400
          // },
          // bitsPerSecond: 8000000000, // 1 gb/s,
          recorderType: MediaStreamRecorder || CanvasRecorder || StereoAudioRecorder
        });
      }

      function errorHandler(error) {
        console.log(error);
      }

      function createUUID() {
        return Math.floor(Math.random() * 10000) + 1;
      }

      function defineCanvasDesenho() {
        var canvas_camera = document.getElementById("canvas-camera");
        var ctx = canvas_camera.getContext("2d"),
          isDown = false,
          prevX,
          prevY;

        canvas_camera.onmousedown = function (e) {
          var pos = getXY(e);

          prevX = pos.x;
          prevY = pos.y;

          /// add new stroke
          points.push([]);

          /// record point in this stroke
          points[points.length - 1].push([pos.x, pos.y]);

          isDown = true;
        };

        canvas_camera.onmousemove = function (e) {
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

        canvas_camera.onmouseup = function () {

          isDown = false;

          //Emite evento de desenho
          enviarDadosSocket('canvas:draw', {
            request: Number(request),
            points: points,
            uuid: ctrl.uuid
          });

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
        for (var i = 0, t, p, pts;
          (pts = points[i]); i++) {
          /// render stroke
          ctx_other.beginPath();
          ctx_other.moveTo(pts[0][0], pts[0][1]);
          for (t = 1;
            (p = pts[t]); t++) {
            ctx_other.lineTo(p[0], p[1]);
          }
          ctx_other.stroke();
        }
      }

      function limparDadosCanvas() {
        var canvas_other = document.getElementById("canvas-camera");
        var ctx_other = canvas_other.getContext("2d");
        ctx_other.clearRect(0, 0, canvas_other.width, canvas_other.height);
        points = [];
      }

      function changeCallStatus(status) {
        $scope.chamada_iniciada = status;
        $scope.$apply();
      }

      function criarSocket() {

        socket = io.connect('https://confitecirisk.brazilsouth.cloudapp.azure.com:4443');

        //Método de Conexão
        socket.emit("init", {
          uuid: ctrl.uuid
        });

        //Resposta dos eventos
        socket.on("call:start", function (data) {
          socketCall(data)
        });

        socket.on("call:ICECandidate", function (data) {
          socketICE(data)
        });

        socket.on("call:end", function (data) {
          socketCallEnd(data)
        });

        socket.on("canvas:clean", function (data) {
          socketCanvasClean(data)
        });

        socket.on("canvas:draw", function (data) {
          socketCanvasDraw(data)
        });

      }

      function socketICE(data) {

        //Verfico a Conexao
        verificaConexao();

        if (data.uuid == ctrl.uuid) return;

        receivedIceCandidate(data);

      }

      function socketCall(data) {
        //Verfico a Conexao
        verificaConexao();

        // Ignore messages from ourself
        if (data.uuid == ctrl.uuid) return;

        //Atribui o ID do caller
        if (!request) request = data.uuid;

        receivedSDP(data);

      }

      function socketCallEnd(data) {
        //Verfico a Conexao
        verificaConexao();

        // Ignore messages from ourself
        if (data.uuid == ctrl.uuid) return;

        encerrarChamada();

      }

      function socketCanvasClean(data) {

        //Verfico a Conexao
        verificaConexao();

        // Ignore messages from ourself
        if (data.uuid == ctrl.uuid) return;

        //Chama o método que limpa os dados
        limparDadosCanvas();

      }

      function socketCanvasDraw(data) {

        //Verfico a Conexao
        verificaConexao();

        // Ignore messages from ourself
        if (data.uuid == ctrl.uuid) return;

        //Chama o método que limpa os dados
        desenharPontos(data);

      }

      function verificaConexao() {

        //Verifica se já está estabelicida a conexão
        if (!peerConnection || peerConnection.signalingState == "closed")
          start(false);

      }

      function criaChamadaLocal() {
        var constraints = {
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

      function encerrarChamada() {

        peerConnection.close();
        localStream.stop();
        request = null;

        changeCallStatus(false);
        limparDadosCanvas();

        alert("Chamada encerrada");

      }


      ctrl.onInit();
      //return ctrl;
    }
  ]);
})(window.angular);