"use strict";
var socketio = require('socket.io');
module.exports = function chatroomio(httpServer) {
    //创建服务器
    var server = socketio(httpServer);
    //监听客户端连接入服务器操作
    server.on("connection", function (client) {
        console.log("一个用户连接成功");
        //监听当前客户端发来数据的操作
        client.on("clientMessage", function (d) {
            console.log("一个用户发送了消息:", d);
            //向所有客户端发送(当前客户端发来的)数据
            server.emit("serverMessage", d);
        });
        //监听当前客户端断开连接的操作
        client.on("disconnect", function () {
            console.log("一个用户断开了连接");
        });
    });
};
//# sourceMappingURL=chatroom.io.js.map