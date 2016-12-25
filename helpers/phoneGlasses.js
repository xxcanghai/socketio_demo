"use strict";
var socketio = require('socket.io');
module.exports = function (httpServer) {
    /** socketio服务器 */
    var server = socketio(httpServer);
    var phoneClientArr = [];
    var glassesClientArr = [];
    server.on("connection", function (client) {
        console.log("一个用户连接成功");
        var noop = function () { };
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
                    var pclient = client;
                    // 从手机在线列表中删除
                    phoneClientArr.splice(phoneClientArr.indexOf(pclient), 1);
                }
                //如果断开的设备是眼镜
                if (client.type == "glasses" && glassesClientArr.indexOf(client) >= 0) {
                    var gclient = client;
                    //从眼镜在线列表中删除
                    glassesClientArr.splice(glassesClientArr.indexOf(gclient), 1);
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
                if (getPhoneClient(d.pid) == undefined) {
                    phoneClientArr.push(pclient);
                }
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
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitSendToGlasses(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    }, noop);
                }
                //------
                successACK(ack);
            },
            /**
             * 手机要关联指定眼镜
             *
             * @param {pg.phoneEmitBindGlassesData} d
             * @param {(ackData: pg.serverBase<pg.phoneEmitBindGlassesACK>) => void} ack
             */
            phoneEmitBindGlasses: function (d, ack) {
                var pclient = client;
                //todo 调用PHP接口
                //----------
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
                if (getGlassesClient(d.gid) == undefined) {
                    glassesClientArr.push(gclient);
                }
                //TODO 调用PHP接口，获取当前眼镜关联的所有手机，并向其发送当前眼镜已经登录的消息
                //--------
                successACK(ack);
            },
            /**
             * 眼镜发送消息给手机
             *
             * @param {any} d
             */
            glassesEmitSendToPhone: function (d, ack) {
                var gclient = client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitSendToPhone(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    }, noop);
                }
                //--------
                successACK(ack);
            },
            /**
             * 眼镜要关联指定手机ID
             *
             * @param {pg.glassesEmitBindPhoneData} d
             * @param {(ackData: pg.serverBase<pg.glassesEmitBindPhoneACK>) => void} ack
             */
            glassesEmitBindPhone: function (d, ack) {
                var gclient = client;
                //todo 调用PHP接口
                //----------
                successACK(ack);
            },
            /**
             * 客户端要获取指定手机ID数组的手机对象列表
             *
             * @param {pg.clientEmitGetPhoneListData} d
             * @param {(ackData: pg.serverBase<pg.clientEmitGetPhoneListACK>) => void} ack
             */
            clientEmitGetPhoneList: function (d, ack) {
                var arr = d.pids.map(function (pid) { return createPhoneListItem(pid, getIsPhoneOnline(pid)); });
                emit.serverEmitPhoneList(client, arr, noop);
                //----------
                successACK(ack);
            },
            /**
             * 客户端要获取指定眼镜ID数组的眼镜对象列表
             *
             * @param {pg.clientEmitGetGlassesListData} d
             * @param {(ackData: pg.serverBase<pg.clientEmitGetGlassesListACK>) => void} ack
             */
            clientEmitGetGlassesList: function (d, ack) {
                var arr = d.gids.map(function (gid) { return createGlassesListItem(gid, getIsGlassesOnline(gid)); });
                emit.serverEmitGlassesList(client, arr, noop);
                //----------
                successACK(ack);
            }
        };
        /** 所有服务器发出的事件集合 */
        var emit = {
            /**
             * 服务器发出给眼镜的消息
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitSendToGlasses: function (socket, d, ack) { },
            /**
             * 服务器发出给手机的消息
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitSendToPhone: function (socket, d, ack) { },
            /**
             * 服务器发出手机列表数据
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitPhoneListData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitPhoneListACK>) => void} ack
             */
            serverEmitPhoneList: function (socket, d, ack) { },
            /**
             * 服务器发出眼镜列表数据
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitGlassesListData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitGlassesListACK>) => void} ack
             */
            serverEmitGlassesList: function (socket, d, ack) { }
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
        Object.keys(on).forEach(function (event) { return client.on(event, function () {
            var logArgs = [].slice.call(arguments);
            if (typeof logArgs[logArgs.length - 1] == "function") {
                logArgs[logArgs.length - 1] = "<ACK-Function>";
            }
            console.info.apply(console, ["on-" + event].concat(logArgs));
            //--------------
            var args = [].slice.call(arguments);
            return on[event].apply(this, args);
        }); });
        //循环重写emit发出事件函数
        Object.keys(emit).forEach(function (event) {
            emit[event] = function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
                var logArgs = [].slice.call(arguments, 1);
                if (typeof logArgs[logArgs.length - 1] == "function") {
                    logArgs[logArgs.length - 1] = "<ACK-Function>";
                }
                console.info.apply(console, ["emit-" + event].concat(logArgs));
                //-------
                if (socket instanceof Array) {
                    socket.forEach(function (s) { return s.emit(event, d, ack); });
                }
                else {
                    socket.emit(event, d, ack);
                }
            };
        });
    });
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
    /**
     * 返回指定眼镜ID的眼镜client连接
     *
     * @param {string} gid 眼镜ID
     * @returns {pg.glassesClient}
     */
    function getGlassesClient(gid) {
        return glassesClientArr.filter(function (c) { return c.gid == gid; })[0];
    }
    /**
     * 返回指定手机ID的手机client连接
     *
     * @param {string} pid 手机ID
     * @returns {pg.phoneClient}
     */
    function getPhoneClient(pid) {
        return phoneClientArr.filter(function (c) { return c.pid == pid; })[0];
    }
    /**
     * 获取指定眼镜ID是否在线
     *
     * @param {string} gid 眼镜ID
     * @returns {boolean}
     */
    function getIsGlassesOnline(gid) {
        return getGlassesClient(gid) != undefined;
    }
    /**
     * 获取指定手机ID是否在线
     *
     * @param {string} pid 手机ID
     * @returns {boolean}
     */
    function getIsPhoneOnline(pid) {
        return getPhoneClient(pid) != undefined;
    }
    /**
     * 根据眼镜ID数组，返回眼镜client数组
     *
     * @param {string[]} gids 眼镜ID数组
     * @param {boolean} isOnlyOnline 是否默认只返回当前在线的client对象，默认为true，若传false则返回的client数组中可能包括undefined对象（即未在线客户端）
     * @returns {pg.glassesClient[]}
     */
    function getGlassesClientArr(gids, isOnlyOnline) {
        if (isOnlyOnline === void 0) { isOnlyOnline = true; }
        return gids.map(function (gid) { return getGlassesClient(gid); }).filter(function (c) { return isOnlyOnline ? c != undefined : true; });
    }
    /**
     * 根据手机ID数组，返回手机client数组
     *
     * @param {string[]} pids 手机ID数组
     * @param {boolean} isOnlyOnline 是否默认只返回当前在线的client对象，默认为true，若传false则返回的client数组中可能包括undefined对象（即未在线客户端）
     * @returns {pg.phoneClient[]}
     */
    function getPhoneClientArr(pids, isOnlyOnline) {
        if (isOnlyOnline === void 0) { isOnlyOnline = true; }
        return pids.map(function (pid) { return getPhoneClient(pid); }).filter(function (c) { return isOnlyOnline ? c != undefined : true; });
    }
    /**
     * 创建手机列表对象数据
     *
     * @param {string} pid 手机ID
     * @param {boolean} is_online 是否在线
     * @returns {pg.serverEmitPhoneListItem}
     */
    function createPhoneListItem(pid, is_online) {
        return {
            pid: pid,
            is_online: is_online
        };
    }
    /**
     * 创建眼镜列表对象数据
     *
     * @param {string} gid 眼镜ID
     * @param {boolean} is_online 是否在线
     * @returns {pg.serverEmitGlassesListItem}
     */
    function createGlassesListItem(gid, is_online) {
        return {
            gid: gid,
            is_online: is_online
        };
    }
};
//# sourceMappingURL=phoneGlasses.js.map