"use restrict";

const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
const path = require("path");
const config = require("config");
const cors = require('cors')
const express = require("express");

// Yes, TLS is required
const serverConfig = {
  key: fs.readFileSync(config.get("ssl.key")),
  cert: fs.readFileSync(config.get("ssl.cert"))
};

//Framework
var app = express()
app.use(cors())

//Servidor
var httpsServer = https.createServer(serverConfig, app);
httpsServer.listen(config.get("port"), "0.0.0.0");

app.get("/test", function(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.send("OK!");
});

//Socket
var io = require('socket.io')(httpsServer);
var sockets = [];

io.on('connection', function (socket) {


  socket.on("init", function (data) {

    socket.uuid = data.uuid;
    //Novo usuário conectado
    console.log("Novo usuário conectado: " + data.uuid);

    //Valida a requisição
    if (!requisicaoValida(socket)) {
      socket.close();
      return;
    }

  });

  socket.on("call:start", function (message) {

    console.log("Chamada Iniciada");

    //Valida a requisição
    if (!requisicaoValida(socket)) {
      socket.close();
      return;
    }

    callStart(message);

  });

  socket.on("call:ICECandidate", function (message) {

    console.log("Chamada ICE Candidate");

    //Valida a requisição
    if (!requisicaoValida(socket)) {
      socket.close();
      return;
    }

    callICECandidate(message);

  });

  socket.on("call:end", function (message) {

    console.log("Chamada Finalizada");

    //Valida a requisição
    if (!requisicaoValida(socket)) {
      socket.close();
      return;
    }

    callEnd(message);

  });

  socket.on("canvas:draw", function (message) {

    console.log("Dados do canvas");

    //Valida a requisição
    if (!requisicaoValida(socket)) {
      socket.close();
      return;
    }

    canvasDraw(message);

  });

  socket.on("canvas:clean", function (message) {

    console.log("Limpa dados do canvas");

    //Valida a requisição
    if (!requisicaoValida(socket)) {
      socket.close();
      return;
    }

    canvasClean(message);

  });

  socket.on("canvas:takePhoto", function (message) {

    console.log("takePhoto");

    //Valida a requisição
    if (!requisicaoValida(socket)) {
      socket.close();
      return;
    }

    takePhoto(message);

  });

  socket.on("canvas:receivePhoto", function (message) {

    console.log("receivePhoto");

    //Valida a requisição
    if (!requisicaoValida(socket)) {
      socket.close();
      return;
    }

    receivePhoto(message);

  });

  sockets.push(socket);
})

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

function enviaDadosSocket(event, uuid, data) {
  try {
    var _socket = retornaSocketPorId(uuid);
    _socket.emit(event, data);
  } catch (error) {
    criarLogErro("Erro ao enviar dados para o Socket: " + uuid, error);
  }
}

function callStart(data) {
  try {
    enviaDadosSocket("call:start", data.request, data);
  } catch (error) {
    criarLogErro("Erro ao Criar Description: " + data.request, error);
  }
}

function callICECandidate(data) {
  try {
    enviaDadosSocket("call:ICECandidate", data.request, data);
  } catch (error) {
    criarLogErro("Erro ao enviar ICE Candidate: " + data.request, error);
  }
}

function callEnd(data) {
  try {
    enviaDadosSocket("call:end", data.request, data);
  } catch (error) {
    criarLogErro("Erro ao encerrar chamada: " + data.request, error);
  }
}

function canvasDraw(data) {
  try {
    enviaDadosSocket("canvas:draw", data.request, data);
  } catch (error) {
    criarLogErro("Erro ao enviar dados Canvas: " + data.request, error);
  }
}

function canvasClean(data) {
  try {
    enviaDadosSocket("canvas:clean", data.request, data);
  } catch (error) {
    criarLogErro("Erro ao limpar Canvas: " + data.request, error);
  }
}

function criarLogErro(mensagem, erro) {
  console.warn(mensagem);
  console.log("Erro: ", erro);
}

function takePhoto(data) {
  try {
    enviaDadosSocket("canvas:takePhoto", data.request, data);
  } catch (error) {
    criarLogErro("TakePhoto: " + data.request, error);
  }
}

function receivePhoto(data) {
  try {
    enviaDadosSocket("canvas:receivePhoto", data.request, data);
  } catch (error) {
    criarLogErro("receivePhoto: " + data.request, error);
  }
}

console.log(
  "Websocket Server running. Visit https://localhost:" + config.get("port")
);