const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
var path = require("path");
const express = require("express");
const config = require("config");

const WebSocketServer = WebSocket.Server;

///TODO: Criar mecanismo para fechar o socket 
///TODO: Abrir conexão socket somente ao clicar em CALL

// Yes, TLS is required
const serverConfig = {
  key: fs.readFileSync(config.get("ssl.key")),
  cert: fs.readFileSync(config.get("ssl.cert"))
};

// ----------------------------------------------------------------------------------------
var app = express();
var LANAccess = config.get('LANAccess');

const httpsServer = https.createServer(serverConfig, app);
httpsServer.listen(config.get('port-https'), LANAccess);

// ----------------------------------------------------------------------------------------
// Create a server for handling websocket calls
const wss = new WebSocketServer({ server: httpsServer });

wss.on("connection", function(ws) {
  ws.on("message", function(message) {
    // Broadcast any received message to all clients
    console.log("received: %s", message);
    wss.broadcast(message);
  });
});

wss.broadcast = function(data) {
  this.clients.forEach(function(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
};

app.get("/", function(req, res) {
  console.log("bateu /");
  res.sendFile(path.join(__dirname + "/index.html"));
});

app.get("/page", function(req, res) {
  console.log("bateu page");
  res.sendFile(path.join(__dirname + "/index.html"));
});

// Expose the css and js resources as "resources"
app.use("/resources", express.static("./"));

console.log(
  "Server running. Visit https://localhost:" +
  config.get('port-https') +
    " in Firefox/Chrome.\n\n\
Some important notes:\n\
  * Note the HTTPS; there is no HTTP -> HTTPS redirect.\n\
  * You'll also need to accept the invalid TLS certificate.\n\
  * Some browsers or OSs may not allow the webcam to be used by multiple pages at once. You may need to use two different browsers or machines.\n"
);
