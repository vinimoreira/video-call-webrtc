const fs = require("fs");
const https = require("https");
var path = require("path");
const express = require("express");
const config = require("config");

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

console.log(path.join(__dirname, 'public'))

// app.get("/page", function(req, res) {
//   console.log("bateu page");
//   res.sendFile(path.join(__dirname + "/index.html"));
// });



var path = require('path');
app.use(express.static(path.join(__dirname, '/public')));

app.get("/", function(req, res) {
  console.log("bateu /");
  res.sendFile(path.join(__dirname + "public/index.html"));
});
