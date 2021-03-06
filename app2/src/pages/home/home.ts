import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { NavController } from "ionic-angular";
import { Diagnostic } from "@ionic-native/diagnostic";
import { Socket } from "ng-socket-io";

@Component({
  selector: "page-home",
  templateUrl: "home.html"
})
export class HomePage implements OnInit {
  @ViewChild("myCanvas") canvas: any;
  @ViewChild("canvasPrint") canvasPrint: any;

  private _localStream: any;
  otherVideo: HTMLMediaElement;
  localVideo: HTMLMediaElement;

  otherUser: string;
  uuid: number;
  peerConnection: RTCPeerConnection;
  serverConnection: WebSocket;
  callerId: number;
  width_components: number;
  tipoBotao: number = 1;
  showButtons: boolean;

  //Canvas
  canvasElement: any;
  lastX: number;
  lastY: number;

  constructor(
    public navCtrl: NavController,
    private diagnostic: Diagnostic,
    private elRef: ElementRef, // private render: Render
    private socket: Socket
  ) {
    this.showButtons = true;
    this.uuid = this.createUUID();
    this.criarSocket();

    navigator.getUserMedia = navigator.mediaDevices.getUserMedia;

    let constraints = {
      audio: true,
      video: {
        // width: 1920,
        // height: 1080,
        facingMode: false ? "user" : "environment"
      }
    };

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
        alert("Erro ao iniciar Video");
        console.log(err);
      });
  }

  ionViewWillLeave() {
    this.socket.disconnect();
  }

  ngOnInit(): any {
    this.canvas.nativeElement.setAttribute("width", this.width_components);
    this.localVideo = this.elRef.nativeElement.querySelector("#my-video");
    this.otherVideo = this.elRef.nativeElement.querySelector("#other-video");
    this.canvasElement = this.canvas.nativeElement;
  }

  start(isCaller) {
    try {
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
        this.tipoBotao = 3;
        this.peerConnection
          .createOffer()
          .then(description => this.createdDescription(description))
          .catch(this.errorHandler);
      }
    } catch (error) {
      alert("Erro ao iniciar Conexão: " + JSON.stringify(error));
    }
  }

  showKeypad() {
    this.tipoBotao = 2;
    setTimeout(() => {
      console.log("Chamou o timeout");
      this.showButtons = false;
    }, 5000);
  }

  voltar() {
    this.tipoBotao = 1;
  }

  startCall() {
    this.start(true);
  }

  stopCall() {
    this.tipoBotao = 1;
    this.showButtons = true;
    this.peerConnection.close();
    //Emite evento de encerramento da chamada
    this.socket.emit("call:end", {
      request: Number(this.callerId),
      uuid: this.uuid
    });
  }

  createUUID(): number {
    return Math.floor(Math.random() * 10000) + 1;
  }

  gotIceCandidate(event) {
    if (event.candidate != null) {
      this.socket.emit("call:ICECandidate", {
        request: Number(this.callerId),
        ice: event.candidate,
        uuid: this.uuid
      });
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
        //Notifica o inicio da chamada
        this.socket.emit("call:start", {
          sdp: this.peerConnection.localDescription,
          uuid: this.uuid,
          request: Number(this.callerId)
        });
      })
      .catch(this.errorHandler);
  }

  errorHandler(error) {
    alert(JSON.stringify(error));
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

  limparDadosCanvas() {
    let context = this.canvasElement.getContext("2d");
    context.clearRect(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );
  }

  criarSocket() {
    //Conecta
    this.socket.connect();
    this.socket.emit("init", { uuid: this.uuid });

    //Resposta dos eventos
    this.socket.on("call:start", data => this.socketCall(data));
    this.socket.on("call:ICECandidate", data => this.socketICE(data));
    this.socket.on("call:end", data => this.socketCallEnd(data));
    this.socket.on("canvas:clean", data => this.socketCanvasClean(data));
    this.socket.on("canvas:draw", data => this.socketCanvasDraw(data));
    this.socket.on("canvas:takePhoto", data => this.socketTakePhoto(data));
  }

  showButton() {
    this.showButtons = true;
    setTimeout(() => {
      this.showButtons = false;
    }, 5000);
  }

  private verificaConexao() {
    //Verifica se já está estabelicida a conexão
    if (!this.peerConnection || this.peerConnection.signalingState == "closed")
      this.start(false);
  }

  private socketICE(data) {
    //Verfico a Conexao
    this.verificaConexao();

    if (data.uuid == this.uuid) return;

    this.receivedIceCandidate(data);
  }

  private socketCall(data: any) {
    //Verfico a Conexao
    this.verificaConexao();

    // Ignore messages from ourself
    if (data.uuid == this.uuid) return;

    //Atribui o ID do caller
    //if (!request) request = data.uuid;

    this.receivedSDP(data);
  }

  private socketCallEnd(data) {
    //Verfico a Conexao
    this.verificaConexao();

    // Ignore messages from ourself
    if (data.uuid == this.uuid) return;

    this.stopCall();
    this.limparDadosCanvas();
  }

  private socketCanvasClean(data) {
    //Verfico a Conexao
    this.verificaConexao();

    // Ignore messages from ourself
    if (data.uuid == this.uuid) return;

    //Chama o método que limpa os dados
    this.limparDadosCanvas();
  }

  private socketCanvasDraw(data) {
    //Verfico a Conexao
    this.verificaConexao();

    // Ignore messages from ourself
    if (data.uuid == this.uuid) return;

    //Chama o método que limpa os dados
    this.desenharPontos(data);
  }

  private socketTakePhoto(data) {
    //
    this.canvasPrint.nativeElement.height = this.localVideo.offsetHeight;
    this.canvasPrint.nativeElement.width = this.localVideo.offsetWidth;
    //
    let ctx = this.canvasPrint.nativeElement.getContext("2d");
    ctx.height = this.localVideo.offsetHeight;
    ctx.width = this.localVideo.offsetWidth;
//
    ctx.drawImage(
      this.localVideo,
      0,
      0,
      this.localVideo.offsetWidth,
      this.localVideo.offsetHeight
    );

    ctx.canvas.toBlob((blob) => {
      this.socket.emit("canvas:receivePhoto", {
        request: Number(this.callerId),
        blob: blob
      });
    });
  }
}
