$(function () {
    var server = io(pgweb.socketServerUrl, {});
    function emitLogin() {
        var data = {
            pid: vm.phoneid
        };
        server.emit("phoneEmitLogin", data, function (d) {
            console.log("phoneEmitLogin事件的ACK函数返回值：", d);
            if (d.code == 0) {
                vm.isLogin = true;
                console.log("手机登录成功");
            }
            else {
                alert(d.msg);
            }
        });
    }
    function emitSendToGlasses() {
        var data = {
            gid: vm.glassesid,
            data: vm.sendmsg
        };
        server.emit("phoneEmitSendToGlasses", data, function (d) {
            if (d.code != 0) {
                alert(d.msg);
            }
        });
    }
    function emitGetGlassesList() {
        var data = {
            gids: vm.gids.split(",")
        };
        server.emit("clientEmitGetGlassesList", data, function (d) {
            if (d.code != 0) {
                alert(d.msg);
            }
        });
    }
    function listen() {
        server.on("disconnect", function () {
            vm.isLogin = false;
        });
        server.on("serverEmitSendToPhone", function (d) {
            vm.msgArr.push(d);
        });
        server.on("serverEmitGlassesList", function (d) {
            console.log("服务器返回眼镜列表：", JSON.stringify(d));
            vm.gArr = d;
        });
    }
    //----------
    var vm;
    var vmData = {
        phoneid: "phone1",
        glassesid: "glasses1",
        sendmsg: "phone Send To glasses",
        msgArr: [],
        isLogin: false,
        gids: "glasses1,glasses2,glasses3",
        gArr: []
    };
    var vmMethod = {
        emitLogin: emitLogin,
        emitSendToGlasses: emitSendToGlasses,
        emitGetGlassesList: emitGetGlassesList
    };
    vm = new Vue({
        el: "#phone",
        data: vmData,
        methods: vmMethod
    });
    listen();
});
//# sourceMappingURL=phone.js.map