$(function () {
    /** 服务器地址 */
    var serverUrl = "http://localhost:3000";
    var server: SocketIOClient.Socket = io(serverUrl, {});

    //要发送的数据
    var sendData = new Date().getTime();
    //将数据发给服务器
    server.emit("clientMessage", sendData);
    console.log("向服务器发送:", sendData);
    
    //监听服务发来的数据
    server.on("serverMessage", function (d) {
        console.log("收到服务器发来数据:", d);
    });
});