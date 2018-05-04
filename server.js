const HTTPS_PORT = 8443;

const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");
var path = require("path");
const express = require("express");

const WebSocketServer = WebSocket.Server;

// Yes, TLS is required
const serverConfig = {
  key: fs.readFileSync("certificates/localhost.key"),
  cert: fs.readFileSync("certificates/localhost.crt")
};

// ----------------------------------------------------------------------------------------
var app = express();

// // Create a server for the client html page
// const handleRequest = function(request, response) {
//   // Render the single client html file for any request the HTTP server receives
//   console.log('request received: ' + request.url);

//   if(request.url === '/') {
//     response.writeHead(200, {'Content-Type': 'text/html'});
//     response.end(fs.readFileSync('client/index.html'));
//   } else if(request.url === '/webrtc.js') {
//     response.writeHead(200, {'Content-Type': 'application/javascript'});
//     response.end(fs.readFileSync('client/webrtc.js'));
//   }
// };

const httpsServer = https.createServer(serverConfig, app);
httpsServer.listen(HTTPS_PORT, "0.0.0.0");

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
  res.sendFile(path.join(__dirname + "/client/index.html"));
});

app.get("/page", function(req, res) {
  console.log("bateu page");
  res.sendFile(path.join(__dirname + "/client/index.html"));
});

// Expose the css and js resources as "resources"
app.use("/resources", express.static("./client"));

console.log(
  "Server running. Visit https://localhost:" +
    HTTPS_PORT +
    " in Firefox/Chrome.\n\n\
Some important notes:\n\
  * Note the HTTPS; there is no HTTP -> HTTPS redirect.\n\
  * You'll also need to accept the invalid TLS certificate.\n\
  * Some browsers or OSs may not allow the webcam to be used by multiple pages at once. You may need to use two different browsers or machines.\n"
);
