$(function () {
    var server = io(pgweb.socketServerUrl, {});
    var data = {
        pid: "1"
    };
    server.emit("phoneEmitLogin", data);
    //监听服务发来的数据
    server.on("serverMessage", function (d) {
        console.log("收到服务器发来数据:", d);
    });
});
//# sourceMappingURL=phone.js.map