$(function () {
    /** 服务器地址 */
    var serverUrl = "http://192.168.0.106:3000";
    var server = io(serverUrl, {});
    //要发送的数据
    var sendData = new Date().getTime();
    //发给服务器
    server.emit("clientMessage", sendData);
    console.log("向服务器发送:", sendData);
    //监听服务发来的数据
    server.on("serverMessage", function (d) {
        console.log("收到服务器发来数据:", d);
    });
});
//# sourceMappingURL=index.js.map