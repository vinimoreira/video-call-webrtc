import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { NavController } from "ionic-angular";
import { Diagnostic } from "@ionic-native/diagnostic";

@Component({
  selector: "page-home",
  templateUrl: "home.html"
})
export class HomePage implements OnInit {
  @ViewChild("myCanvas") canvas: any;

  private _localStream: any;
  otherVideo: HTMLMediaElement;
  localVideo: HTMLMediaElement;

  otherUser: string;
  uuid: number;
  peerConnection: RTCPeerConnection;
  serverConnection: WebSocket;
  callerId: number;
  width_components: number;

  //Canvas
  canvasElement: any;
  lastX: number;
  lastY: number;

  constructor(
    public navCtrl: NavController,
    private diagnostic: Diagnostic,
    private elRef: ElementRef // private render: Render
  ) {
    this.uuid = this.createUUID();
    this.serverConnection = new WebSocket(
      "wss://" +
        "confitecirisk.brazilsouth.cloudapp.azure.com" +
        ":4443/" +
        this.uuid
    );
    this.serverConnection.onmessage = ev => this.gotMessageFromServer(ev);

    navigator.getUserMedia = navigator.mediaDevices.getUserMedia;

    let constraints = {
      audio: true,
      video: { facingMode: false ? "user" : "environment" }
    };

    let permissions = [
      this.diagnostic.permission.CAMERA,
      this.diagnostic.permission.RECORD_AUDIO
    ];

    this.diagnostic.requestRuntimePermissions(permissions).then(data => {
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(stream => {
          this.localVideo.muted = true;
          this.localVideo.srcObject = stream;
          this.localVideo.play();

          this._localStream = stream;
          this.start(false);
        })
        .catch(err => {
          console.log(err);
        });
    });
  }

  ngOnInit(): any {
    // debugger;

    // let content = this.elRef.nativeElement.querySelector("#video-content");
    // this.width_components = content.width;
    // this.width_components = this.videoContentElement.nativeElement.offsetWidth;
    // this.localVideoElement.nativeElement.setAttribute(
    //   "width",
    //   this.width_components
    // );

    this.canvas.nativeElement.setAttribute("width", this.width_components);
    this.localVideo = this.elRef.nativeElement.querySelector("#my-video");
    this.otherVideo = this.elRef.nativeElement.querySelector("#other-video");
    this.canvasElement = this.canvas.nativeElement;

  }

  start(isCaller) {
    let configuration = {
      iceServers: [
        {
          urls: ["turn:13.250.13.83:3478?transport=udp"],
          username: "YzYNCouZM1mhqhmseWk6",
          credential: "YzYNCouZM1mhqhmseWk6"
        }
      ]
    };

    this.peerConnection = new RTCPeerConnection(configuration);
    this.peerConnection.onicecandidate = ev => this.gotIceCandidate(ev);
    this.peerConnection.ontrack = ev => this.gotRemoteStream(ev);
    this.peerConnection.addStream(this._localStream);

    if (isCaller) {
      this.peerConnection
        .createOffer()
        .then(description => this.createdDescription(description))
        .catch(this.errorHandler);
    }
  }

  startCall() {
    this.start(true);
  }

  stopCall() {
    this.peerConnection.close();
    this._localStream.stop();
  }

  // Taken from http://stackoverflow.com/a/105074/515584
  // Strictly speaking, it's not a real UUID, but it gets the job done here
  private createUUID(): number {
    return Math.floor(Math.random() * 10000) + 1;
  }

  gotIceCandidate(event) {
    if (event.candidate != null) {
      this.serverConnection.send(
        JSON.stringify({
          type: "ICE_CANDIDATE",
          request: Number(this.callerId),
          ice: event.candidate,
          uuid: this.uuid
        })
      );
    }
  }

  gotRemoteStream(event) {
    console.log("got remote stream");
    this.otherVideo.srcObject = event.streams[0];
  }

  createdDescription(description) {
    console.log("got description");

    this.peerConnection
      .setLocalDescription(description)
      .then(() => {
        //Manda a sinalização de conexão para o server
        this.serverConnection.send(
          JSON.stringify({
            type: "CREATE_DESCRIPTION",
            sdp: this.peerConnection.localDescription,
            uuid: this.uuid,
            request: Number(this.callerId)
          })
        );
      })
      .catch(this.errorHandler);
  }

  gotMessageFromServer(message) {
    if (
      !this.peerConnection ||
      this.peerConnection.signalingState == "closed"
    ) {
      this.start(false);
    }

    if (!message.data) return;

    let _data = JSON.parse(message.data);

    // Ignore messages from ourself
    if (_data.uuid == this.uuid) return;

    //Faz a chamada da função de acordo com o tipo de Mensagem
    switch (_data.type) {
      case "CREATE_DESCRIPTION":
        this.receivedSDP(_data);
        break;
      case "ICE_CANDIDATE":
        this.receivedIceCandidate(_data);
        break;
      case "DRAW_CANVAS":
        this.desenharPontos(_data);
        break;
      case "CLEAN_CANVAS":
        this.limparDadosCanvas(_data);
        break;
      case "ENCERRAR_CHAMADA":
        this.stopCall();
        break;
      default:
        break;
    }
  }

  private errorHandler(error) {
    console.log(error);
  }

  receivedSDP(signal) {
    if (signal.sdp) {
      this.peerConnection
        .setRemoteDescription(new RTCSessionDescription(signal.sdp))
        .then(() => {
          // Only create answers in response to offers
          if (signal.sdp.type == "offer") {
            this.peerConnection
              .createAnswer()
              .then(description => this.createdDescription(description))
              .catch(this.errorHandler);
          }
        })
        .catch(this.errorHandler);
    }
  }

  receivedIceCandidate(signal) {
    if (signal.ice) {
      this.peerConnection
        .addIceCandidate(new RTCIceCandidate(signal.ice))
        .catch(this.errorHandler);
    }
  }

  desenharPontos(data) {
    let points = data.points;
    let context = this.canvasElement.getContext("2d");
    context.clearRect(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );

    context.lineWidth = 4;
    context.strokeStyle = "#FF0000";
    context.fillStyle = "transparent";
    context.globalAlpha = 1;
    context.globalCompositeOperation = "source-over";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.font = '15px "Arial"';

    /// get a stroke
    for (var i = 0, t, p, pts; (pts = points[i]); i++) {
      /// render stroke
      context.beginPath();
      context.moveTo(pts[0][0], pts[0][1]);
      for (t = 1; (p = pts[t]); t++) {
        context.lineTo(p[0], p[1]);
      }
      context.stroke();
    }
  }

  limparDadosCanvas(data) {
    let context = this.canvasElement.getContext("2d");
    context.clearRect(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );
  }
}
