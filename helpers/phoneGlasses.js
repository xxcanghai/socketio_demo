"use strict";
var socketio = require('socket.io');
/**
 * 创建一个服务器返回数据对象
 *
 * @template T
 * @param {number} code 状态码，成功为0，非0为失败，默认为0
 * @param {string} msg 信息，默认空字符串
 * @param {T} data 实际数据，默认为null
 * @returns {pg.serverBase<T>}
 */
function createServerBase(code, msg, data) {
    if (code === void 0) { code = 0; }
    if (msg === void 0) { msg = ""; }
    if (data === void 0) { data = null; }
    return {
        code: code,
        msg: msg,
        data: data
    };
}
function createServerBaseSuccess(data) {
    if (data === void 0) { data = null; }
    return createServerBase(0, "成功", data);
}
function createServerBaseFail(failMess) {
    if (failMess === void 0) { failMess = "失败"; }
    return createServerBase(-1, failMess, null);
}
module.exports = function chatroomio(httpServer) {
    /** socketio服务器 */
    var server = socketio(httpServer);
    /** 眼镜和手机的字典（眼镜ID为key，手机ID为value） */
    var glassesPhoneDic = {};
    var phoneClientArr = [];
    var glassesClientArr = [];
    server.on("connection", function (client) {
        console.log("一个用户连接成功");
        /** 所有客户端监听事件集合 */
        var on = {
            /**
             * 客户端断开连接
             *
             * @param {string} mess
             */
            disconnect: function (mess) {
                console.log("一个用户断开了连接");
                //如果断开的设备是手机
                if (client.type == "phone" && phoneClientArr.indexOf(client) >= 0) {
                    var pclient_1 = client;
                    // 从手机在线列表中删除
                    phoneClientArr.splice(phoneClientArr.indexOf(pclient_1), 1);
                    //从dic中删除对应关系
                    Object.keys(glassesPhoneDic).forEach(function (gid) {
                        if (glassesPhoneDic[gid] == pclient_1.pid) {
                            delete glassesPhoneDic[gid];
                        }
                    });
                }
                //如果断开的设备是眼镜
                if (client.type == "glasses" && glassesClientArr.indexOf(client) >= 0) {
                    var gclient = client;
                    //从眼镜在线列表中删除
                    glassesClientArr.splice(glassesClientArr.indexOf(gclient), 1);
                    //从dic中删除对应关系
                    if (gclient.gid in glassesPhoneDic) {
                        delete glassesPhoneDic[gclient.gid];
                    }
                }
            },
            //--------------手机事件--------------
            /**
             * 客户端手机登录
             *
             * @param {any} d
             */
            phoneEmitLogin: function (d, ack) {
                var pclient = client;
                pclient.pid = d.pid;
                pclient.type = "phone";
                phoneClientArr.push(pclient);
                //------
                successACK(ack);
            },
            /**
             * 手机发送消息给眼镜
             *
             * @param {any} d
             */
            phoneEmitSendToGlasses: function (d, ack) {
                var pclient = client;
                //------
                successACK(ack);
            },
            //--------------眼镜事件--------------
            /**
             * 客户端眼镜登录
             *
             * @param {any} d
             */
            glassesEmitLogin: function (d, ack) {
                var gclient = client;
                gclient.type = "glasses";
                gclient.gid = d.gid;
                gclient.pid = d.pid;
                glassesClientArr.push(gclient);
                //添加眼镜跟手机ID字典，眼镜id为key，手机id为value
                glassesPhoneDic[d.gid] = d.pid;
                //--------
                successACK(ack);
            },
            /**
             * 眼镜发送消息给眼镜
             *
             * @param {any} d
             */
            glassesEmitSendToPhone: function (d, ack) {
                var gclient = client;
                //--------
                successACK(ack);
            }
        };
        /**
         * 给客户端调用ack函数
         *
         * @param {Function} ack
         */
        function successACK(ack, ackData) {
            if (ackData === void 0) { ackData = null; }
            if (typeof ack == "function") {
                if (ackData == null) {
                    ack(createServerBaseSuccess());
                }
                else {
                    ack(ackData);
                }
            }
        }
        //=============
        //循环创建监听
        Object.keys(on).forEach(function (event) { return client.on(event, on[event]); });
    });
};
//# sourceMappingURL=phoneGlasses.js.map