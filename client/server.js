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
