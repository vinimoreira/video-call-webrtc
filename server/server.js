"use restrict";

// const HTTPS_PORT = 8443;

const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const path = require("path");
const config = require("config");
var cors = require('cors')
const express = require("express");
// const url = require("url");


const WebSocketServer = WebSocket.Server;

// Yes, TLS is required
const serverConfig = {
  key: fs.readFileSync(config.get("ssl.key")),
  cert: fs.readFileSync(config.get("ssl.cert"))
};

var app = express()
app.use(cors())

const httpsServer = https.createServer(serverConfig, app);
httpsServer.listen(config.get("port"), "0.0.0.0");


var io = require('socket.io')(httpsServer);
var sockets = [];

// ----------------------------------------------------------------------------------------
// Create a server for handling websocket calls
// const wss = new WebSocketServer({ server: httpsServer });
// wss.on("connection", function(ws, req) {
//   var uuid = ws.upgradeReq.url.replace("/", "");
//   ws.uuid = uuid;

//   //Novo usuário conectado
//   console.log("Novo usuário conectado: " + uuid);

//   //Valida a requisição
//   if (!requisicaoValida(ws)) {
//     ws.close();
//     return;
//   }

//   ws.on("message", function(message) {
//     var data = JSON.parse(message);

//     //Mensagem Recebida
//     console.log("Mensagem Recebida");
//     console.log("Tipo de Mensagem ", data.type);

//     //Caso não tenha identificador na mensagem
//     if (!data.type) return;

//     var type = data.type.toUpperCase();

//     switch (type) {
//       case "CREATE_DESCRIPTION":
//         criarDescription(data);
//         break;
//       case "ICE_CANDIDATE":
//         sendIceCandidate(data);
//         break;
//       case "DRAW_CANVAS":
//         enviarDadosCanvas(data);
//         break;
//       case "CLEAN_CANVAS":
//         limparCanvas(data);
//         break;
//       case "ENCERRAR_CHAMADA":
//         encerrarChamada(data);
//         break;
//       default:
//         break;
//     }
//   });

//   socket.push(ws);
// });
io.on('connection', function (socket) {

  // var uuid = ws.upgradeReq.url.replace("/", "");


  socket.on("create", function (data) {

    socket.uuid = data.uuid;
    //Novo usuário conectado
    console.log("Novo usuário conectado: " + data.uuid);

    //Valida a requisição
    if (!requisicaoValida(socket)) {
      socket.close();
      return;
    }

  })

  socket.on("message", function (message) {

    console.log('TESTE');
    console.log(JSON.parse(message.data));

    // var _message = JSON.parse(message);
    var data = JSON.parse(message.data);

    //Mensagem Recebida
    console.log("Mensagem Recebida");
    console.log("Tipo de Mensagem ", data.type);

    //Caso não tenha identificador na mensagem
    if (!data.type) return;

    var type = data.type.toUpperCase();

    switch (type) {
      case "CREATE_DESCRIPTION":
        criarDescription(data);
        break;
      case "ICE_CANDIDATE":
        sendIceCandidate(data);
        break;
      case "DRAW_CANVAS":
        enviarDadosCanvas(data);
        break;
      case "CLEAN_CANVAS":
        limparCanvas(data);
        break;
      case "ENCERRAR_CHAMADA":
        encerrarChamada(data);
        break;
      default:
        break;
    }
  });

  sockets.push(socket);

});

function requisicaoValida(params) {
  //Incluir validações, pode ser um toke
  //Valida se já não tem alguem com aquele ID
  return true;
}

function retornaSocketPorId(id) {
  try {
    var _socket = sockets.find(function (socket) {
      return socket.uuid == id;
    });

    if (_socket) console.log("SOCKET ENCONTRADO: ", id);

    return _socket;
  } catch (error) {
    criarLogErro("Erro ao retornar Socket: " + id, error);
  }
}

function enviaDadosSocket(uuid, data) {
  try {
    var _socket = retornaSocketPorId(uuid);
    _socket.emit("message",JSON.stringify(data));
  } catch (error) {
    criarLogErro("Erro ao enviar dados para o Socket: " + uuid, error);
  }
}

function criarDescription(data) {
  try {
    console.log("Criar Stream");
    enviaDadosSocket(data.request, data);
  } catch (error) {
    criarLogErro("Erro ao Criar Description: " + data.request, error);
  }
}

function sendIceCandidate(data) {
  try {
    console.log("Enviar ICE Candidate");
    enviaDadosSocket(data.request, data);
  } catch (error) {
    criarLogErro("Erro ao enviar ICE Candidate: " + data.request, error);
  }
}

function enviarDadosCanvas(data) {
  try {
    console.log("Enviando dados do canvas");
    enviaDadosSocket(data.request, data);
  } catch (error) {
    criarLogErro("Erro ao enviar dados Canvas: " + data.request, error);
  }
}

function limparCanvas(data) {
  try {
    console.log("Limpar dados do canvas");
    enviaDadosSocket(data.request, data);
  } catch (error) {
    criarLogErro("Erro ao limpar Canvas: " + data.request, error);
  }
}

function encerrarChamada(data) {
  try {
    console.log("Encerrar chamada");
    enviaDadosSocket(data.request, data);
  } catch (error) {
    criarLogErro("Erro ao encerrar chamada: " + data.request, error);
  }
}

function criarLogErro(mensagem, erro) {
  console.warn(mensagem);
  console.log("Erro: ", erro);
}

console.log(
  "Websocket Server running. Visit https://localhost:" + config.get("port")
);