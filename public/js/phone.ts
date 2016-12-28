$(function () {
    var server: SocketIOClient.Socket = io(pgweb.socketServerUrl, {});


    function emitLogin() {
        var data: pg.phoneEmitLoginData = {
            pid: vm.phoneid,
        };
        server.emit("phoneEmitLogin", data, function (d) {
            console.log("phoneEmitLogin事件的ACK函数返回值：", d);
            if (d.code == 0) {
                vm.isLogin = true;
                console.log("手机登录成功");
            } else {
                alert(d.msg);
            }
        });
    }

    function emitSendToGlasses() {
        var data: pg.phoneEmitSendToGlassesData = {
            gid: vm.glassesid,
            data: vm.sendmsg
        };
        server.emit("phoneEmitSendToGlasses", data);
    }

    function emitGetGlassesList() {
        var data: pg.clientEmitGetGlassesListData = {
            gids: vm.gids.split(",")
        };
        server.emit("clientEmitGetGlassesList", data);
    }

    function listen() {
        server.on("disconnect", function () {
            vm.isLogin = false;
        });
        server.on("serverEmitSendToPhone", function (d: pg.serverEmitSendToPhoneData) {
            vm.msgArr.push(d);
        });
        server.on("serverEmitGlassesList", function (d: pg.serverEmitGlassesListData) {
            console.log("服务器返回眼镜列表：", JSON.stringify(d));
            vm.gArr = d;
        });
    }


    //----------
    var vm: vuejs.Vue & typeof vmData & typeof vmMethod;
    var vmData = {
        phoneid: "phone1",
        glassesid: "glasses1",
        sendmsg: "phone Send To glasses",
        msgArr: [],
        isLogin: false,
        gids: "glasses1,glasses2,glasses3",
        gArr: []
    }
    var vmMethod = {
        emitLogin: emitLogin,
        emitSendToGlasses: emitSendToGlasses,
        emitGetGlassesList: emitGetGlassesList
    };
    vm = <any>new Vue({
        el: "#phone",
        data: vmData,
        methods: vmMethod
    });
    listen();
});