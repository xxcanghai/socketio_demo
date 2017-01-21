$(function () {
    var server: SocketIOClient.Socket = io(pgweb.socketServerUrl, {});


    function emitPageOpen() {
        var data: pg.clientEmitLineLogData = {
            activityId: vm.activityId,
            userId: vm.userId,
        };
        server.emit("clientEmitLineLog", data, function (d) {
            if (d.code != 0) {
                alert(d.msg);
            } else {
                console.log("记录成功！");
                vm.logs.push(JSON.stringify(d));
            }
        });
    }

    //----------
    var vm: vuejs.Vue & typeof vmData & typeof vmMethod;
    var vmData = {
        activityId: 123,
        userId: "456",
        logs:[],
    }
    var vmMethod = {
         emitPageOpen: emitPageOpen,
    };
    vm = <any>new Vue({
        el: "#lineLog",
        data: vmData,
        methods: vmMethod
    });
});