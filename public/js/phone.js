$(function () {
    var server = io(pgweb.socketServerUrl, {});
    function emitLogin() {
        var data = {
            pid: vm.phoneid,
            data: "{}"
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
    function emitBindGlasses() {
        var data = {
            gid: vm.glassesid
        };
        server.emit("phoneEmitBindGlasses", data, function (d) {
            console.log(d);
            if (d.code != 0) {
                alert(d.msg);
            }
        });
    }
    function customSendClick(e) {
        var data = {
            gid: vm.glassesid,
            data: vm.customData
        };
        server.emit(vm.customEvent, data, function (d) {
            // if (d.code != 0) {
            //     alert(d.msg);
            // } else {
            //     alert("发送成功");
            // }
            alert(d.msg);
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
        server.on("serverEmitGlassesLoginChange", function (d) {
            console.log("serverEmitGlassesLoginChange", d);
            vm.gArr.filter(function (g) { return g.gid == d.gid; })[0].is_online = d.is_login;
        });
        server.on("serverEmitPhoneBinded", function (d) {
            console.log("serverEmitPhoneBinded", "当前手机已被眼镜ID：<", d.gid, ">所绑定");
        });
        server.on("serverEmitGetInfo", function (d) {
            console.log("serverEmitGetInfo", d);
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
        gArr: [],
        customEvent: "",
        customData: ""
    };
    var vmMethod = {
        emitLogin: emitLogin,
        emitSendToGlasses: emitSendToGlasses,
        emitGetGlassesList: emitGetGlassesList,
        emitBindGlasses: emitBindGlasses,
        customSendClick: customSendClick
    };
    vm = new Vue({
        el: "#phone",
        data: vmData,
        methods: vmMethod
    });
    listen();
});
//# sourceMappingURL=phone.js.map