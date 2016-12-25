$(function () {
    var server = io(pgweb.socketServerUrl, {});
    function emitLogin() {
        var data = {
            gid: vm.glassesid
        };
        server.emit("glassesEmitLogin", data, function (d) {
            vm.isLogin = true;
            console.log("眼镜登录成功");
        });
    }
    function emitSendToPhone() {
        var data = {
            pid: vm.phoneid,
            data: vm.sendmsg
        };
        server.emit("glassesEmitSendToPhone", data);
    }
    function emitGetPhoneList() {
        var data = {
            pids: vm.pids.split(",")
        };
        server.emit("clientEmitGetPhoneList", data);
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
        emitGetPhoneList: emitGetPhoneList
    };
    vm = new Vue({
        el: "#glasses",
        data: vmData,
        methods: vmMethod
    });
    listen();
});
//# sourceMappingURL=glasses.js.map