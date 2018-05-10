import { Component, ElementRef, OnInit, ViewChild } from "@angular/core";
import { NavController } from "ionic-angular";
import { Diagnostic } from "@ionic-native/diagnostic";
import { Socket } from 'ng-socket-io';

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
    private elRef: ElementRef, // private render: Render
    private socket: Socket
  ) {

    this.uuid = this.createUUID();
    this.criarSocket();

    navigator.getUserMedia = navigator.mediaDevices.getUserMedia;

    let constraints = {
      audio: true,
      video: {
        facingMode: false ? "user" : "environment",
        // mandatory: {
        //   maxHeight: 720,
        //   maxWidth: 1280
        // },
        // width: { min: 1024, ideal: 1280, max: 1920 },
        // height: { min: 776, ideal: 720, max: 1080 }
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
        this.peerConnection
          .createOffer()
          .then(description => this.createdDescription(description))
          .catch(this.errorHandler);
      }
    } catch (error) {
      alert('Erro ao iniciar Conexão: ' + JSON.stringify(error));
    }

  }

  startCall() {
    this.start(true);
  }

  stopCall() {
    debugger;

    //Emite evento de encerramento da chamada
    this.socket.emit('call:end', {
      request: Number(this.callerId),
      uuid: this.uuid
    });

    this.peerConnection.close();


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

  // gotMessageFromServer(message) {
  //   if (
  //     !this.peerConnection ||
  //     this.peerConnection.signalingState == "closed"
  //   ) {
  //     this.start(false);
  //   }

  //   if (!message) return;

  //   let _data = JSON.parse(message);

  //   // Ignore messages from ourself
  //   if (_data.uuid == this.uuid) return;

  //   //Faz a chamada da função de acordo com o tipo de Mensagem
  //   switch (_data.type) {
  //     case "CREATE_DESCRIPTION":
  //       this.receivedSDP(_data);
  //       break;
  //     case "ICE_CANDIDATE":
  //       this.receivedIceCandidate(_data);
  //       break;
  //     case "DRAW_CANVAS":
  //       this.desenharPontos(_data);
  //       break;
  //     case "CLEAN_CANVAS":
  //       this.limparDadosCanvas(_data);
  //       break;
  //     case "ENCERRAR_CHAMADA":
  //       this.stopCall();
  //       break;
  //     default:
  //       break;
  //   }
  // }

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
    this.socket.emit('init', { uuid: this.uuid })


    //Resposta dos eventos
    this.socket.on("call:start", (data) => this.socketCall(data))
    this.socket.on("call:ICECandidate", (data) => this.socketICE(data));
    this.socket.on("call:end", (data) => this.socketCallEnd(data))
    this.socket.on("canvas:clean", (data) => this.socketCanvasClean(data))
    this.socket.on("canvas:draw", (data) => this.socketCanvasDraw(data));

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


}
