"use restrict";

// const HTTPS_PORT = 8443;

const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const path = require("path");
const express = require("express");
const config = require("config");
const url = require("url");
const enums = require("./enums");

const WebSocketServer = WebSocket.Server;

// Yes, TLS is required
const serverConfig = {
  key: fs.readFileSync(config.get("ssl.key")),
  cert: fs.readFileSync(config.get("ssl.cert"))
};

const httpsServer = https.createServer(serverConfig);
httpsServer.listen(config.get("port"), "0.0.0.0");

// ----------------------------------------------------------------------------------------
// Create a server for handling websocket calls
const wss = new WebSocketServer({ server: httpsServer });
var socket = [];

wss.on("connection", function(ws, req) {
  var uuid = ws.upgradeReq.url.replace("/", "");
  ws.uuid = uuid;

  //Novo usuário conectado
  console.log("Novo usuário conectado: " + uuid);

  //Valida a requisição
  if (!requisicaoValida(ws)) {
    ws.close();
    return;
  }

  ws.on("message", function(message) {
    var data = JSON.parse(message);

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
        enviarDadosCanvas(data);
        break;
      default:
        break;
    }
  });

  socket.push(ws);
});

function requisicaoValida(params) {
  //Incluir validações, pode ser um toke
  //Valida se já não tem alguem com aquele ID
  return true;
}

function retornaSocketPorId(id) {
  var _socket = socket.find(function(socket) {
    return socket.uuid == id;
  });

  if (_socket) console.log("SOCKET ENCONTRADO: ", id);

  return _socket;
}

function enviaDadosSocket(uuid, data) {
  var _socket = retornaSocketPorId(uuid);
  _socket.send(JSON.stringify(data));
}

function criarDescription(data) {
  console.log("Criar Stream");
  enviaDadosSocket(data.request, data);
}

function sendIceCandidate(data) {
  console.log("Enviar ICE Candidate");
  enviaDadosSocket(data.request, data);
}

function enviarDadosCanvas(data) {
  console.log("Enviando dados do canvas");
  enviaDadosSocket(data.request, data);
}

function limparCanvas() {
  console.log("Limpar dados do canvas");
  enviaDadosSocket(data.request, data);
}

console.log(
  "Websocket Server running. Visit https://localhost:" + config.get("port")
);
