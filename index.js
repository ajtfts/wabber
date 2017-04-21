var express = require('express')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
app.use(express.static(__dirname + '/public'))

var worldSize = [1000, 1000]

app.get('/', function(req, res) {
   res.sendFile(__dirname + '/index.html')
})

io.on('connection', function(socket) {
   var socketId = socket.id
   var clientIp = socket.request.connection.remoteAddress
   
   console.log("New connection from " + clientIp + " with socket id " + socketId)

   var initData = {
     id : socketId,
     worldSize
   }

   // emit to new socket
   io.to(socketId).emit('i', initData)

   socket.on('disconnect', function() {
      console.log(socketId + ' disconnected')
   })
})

http.listen(3000, function() {
   console.log("listening on port 3000...")
})
