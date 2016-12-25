$(function () {
    var server: SocketIOClient.Socket = io(pgweb.socketServerUrl, {});


    function emitLogin() {
        var data: pg.glassesEmitLoginData = {
            gid: vm.glassesid,
        };
        server.emit("glassesEmitLogin", data, function (d) {
            vm.isLogin = true;
            console.log("眼镜登录成功");
        });
    }

    function emitSendToPhone() {
        var data: pg.glassesEmitSendToPhoneData = {
            pid: vm.phoneid,
            data: vm.sendmsg
        };
        server.emit("glassesEmitSendToPhone", data);
    }

    function emitGetPhoneList() {
        var data: pg.clientEmitGetPhoneListData = {
            pids: vm.pids.split(",")
        };
        server.emit("clientEmitGetPhoneList", data);
    }

    function listen() {
        server.on("disconnect", function () {
            vm.isLogin = false;
        });
        server.on("serverEmitSendToGlasses", function (d: pg.serverEmitSendToGlassesData) {
            vm.msgArr.push(d);
        });
        server.on("serverEmitPhoneList", function (d: pg.serverEmitPhoneListData) {
            vm.pArr = d;
        });
    }

    //----------
    var vm: vuejs.Vue & typeof vmData & typeof vmMethod;
    var vmData = {
        phoneid: "phone1",
        glassesid: "glasses1",
        sendmsg: "glasses Send To phone",
        isLogin: false,
        msgArr: [],
        pids: "phone0,phone1",
        pArr: []
    }
    var vmMethod = {
        emitLogin: emitLogin,
        emitSendToPhone: emitSendToPhone,
        emitGetPhoneList: emitGetPhoneList
    };
    vm = <any>new Vue({
        el: "#glasses",
        data: vmData,
        methods: vmMethod
    });
    listen();
});