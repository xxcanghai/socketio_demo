$(function () {
    var server = io(pgweb.socketServerUrl, {});
    function emitLogin() {
        var data = {
            gid: vm.glassesid,
            data: "{}"
        };
        server.emit("glassesEmitLogin", data, function (d) {
            if (d.code != 0) {
                alert(d.msg);
            }
            else {
                vm.isLogin = true;
                console.log("眼镜登录成功");
            }
        });
    }
    function emitSendToPhone() {
        var data = {
            pid: vm.phoneid,
            data: vm.sendmsg
        };
        server.emit("glassesEmitSendToPhone", data, function (d) {
            if (d.code != 0) {
                alert(d.msg);
            }
        });
    }
    function emitGetPhoneList() {
        var data = {
            pids: vm.pids.split(",")
        };
        server.emit("clientEmitGetPhoneList", data, function (d) {
            if (d.code != 0) {
                alert(d.msg);
            }
        });
    }
    function emitBindPhone() {
        var data = {
            pid: vm.phoneid
        };
        server.emit("glassesEmitBindPhone", data, function (d) {
            console.log(d);
            if (d.code != 0) {
                alert(d.msg);
            }
        });
    }
    function emitGetInfo() {
        var data = {
            data: "哈哈哈哈",
            pid: "phone1"
        };
        server.emit("glassesEmitGetInfo", data, function (d) {
            console.log("glassesEmitGetInfo", d);
        });
    }
    function listen() {
        server.on("disconnect", function () {
            vm.isLogin = false;
        });
        server.on("serverEmitSendToGlasses", function (d) {
            vm.msgArr.push(d);
        });
        server.on("serverEmitPhoneList", function (d) {
            vm.pArr = d;
        });
        server.on("serverEmitMeetingJoin", function (d) {
            alert(d.data);
            console.log(d.data);
        });
        server.on("serverEmitPhoneLoginChange", function (d) {
            console.log("serverEmitPhoneLoginChange", d);
            vm.pArr.filter(function (p) { return p.pid == d.pid; })[0].is_online = d.is_login;
        });
        server.on("serverEmitGlassesBinded", function (d) {
            console.log("serverEmitGlassesBinded", "当前眼镜已被手机ID：<", d.pid, ">所绑定");
        });
    }
    //----------
    var vm;
    var vmData = {
        phoneid: "phone1",
        glassesid: "glasses1",
        sendmsg: "glasses Send To phone",
        isLogin: false,
        msgArr: [],
        pids: "phone0,phone1",
        pArr: []
    };
    var vmMethod = {
        emitLogin: emitLogin,
        emitSendToPhone: emitSendToPhone,
        emitGetPhoneList: emitGetPhoneList,
        emitBindPhone: emitBindPhone,
        emitGetInfo: emitGetInfo
    };
    vm = new Vue({
        el: "#glasses",
        data: vmData,
        methods: vmMethod
    });
    listen();
});
//# sourceMappingURL=glasses.js.map