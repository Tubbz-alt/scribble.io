"use strict";
Error.stackTraceLimit = 30;

const port = 8080;
const MAX_CLIENTS = 10;
const express = require('express');
const http = require('http');
const app = express();

const server = http.createServer(app).listen(port);
const io = require('socket.io')(server);
app.use(express.static(__dirname + '/public'));

let current_id = 0;
let users = [];
class User{
    static getNextID(){
        return current_id++;
    }
    constructor(socket){
        this.socket = socket;
        this.id = this.getNextID();
    }
}
io.on('connection', function(socket){
    console.log("New client!");
    socket.on('draw', function(drawbytes){
        socket.broadcast.emit('draw', drawbytes);
    });
});

console.log("Starting scribble.io on port: " + port);