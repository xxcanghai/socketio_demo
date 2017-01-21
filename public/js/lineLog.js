$(function () {
    var server = io(pgweb.socketServerUrl, {});
    function emitPageOpen() {
        var data = {
            activityId: vm.activityId,
            userId: vm.userId
        };
        server.emit("clientEmitLineLog", data, function (d) {
            if (d.code != 0) {
                alert(d.msg);
            }
            else {
                console.log("记录成功！");
                vm.logs.push(JSON.stringify(d));
            }
        });
    }
    //----------
    var vm;
    var vmData = {
        activityId: 123,
        userId: "456",
        logs: []
    };
    var vmMethod = {
        emitPageOpen: emitPageOpen
    };
    vm = new Vue({
        el: "#lineLog",
        data: vmData,
        methods: vmMethod
    });
});
//# sourceMappingURL=lineLog.js.map