"use strict";
var socketio = require('socket.io');
var tool = require('./tool');
var php = require('./phpHelper');
module.exports = function (httpServer) {
    /** socketio服务器 */
    var server = socketio(httpServer);
    /** 所有手机socket列表 */
    var phoneClientArr = [];
    /** 所有眼镜socket列表 */
    var glassesClientArr = [];
    /** 专门用于记录在线时长的客户端列表 */
    var lineLogClinetArr = [];
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
                    var pclient_1 = client;
                    console.log("手机断开连接！", pclient_1.pid);
                    // 从手机在线列表中删除
                    phoneClientArr.splice(phoneClientArr.indexOf(pclient_1), 1);
                    /** 登记设备在线时长-退出 */
                    php.onlineTimeLength.emit({
                        appointed: pclient_1.pid,
                        type: 1
                    });
                    // 登记设备播放记录-退出
                    php.AppointedTime.emit({
                        appointed: pclient_1.pid,
                        type: 1
                    });
                    //调用PHP接口，获取当前手机关联的所有眼镜
                    php.deviceBindingList.emit({ appointed: pclient_1.pid }, function (d) {
                        if (d.code != 200)
                            return;
                        d.res.forEach(function (o) {
                            // 遍历眼镜列表，若眼镜在线则向其发送当前关联手机已经退出的消息
                            var g = getGlassesClient(o.appointed);
                            var isOnline = g != undefined;
                            if (isOnline) {
                                emit.serverEmitPhoneLoginChange(g, { is_login: false, pid: pclient_1.pid });
                            }
                        });
                    });
                }
                else if (client.type == "glasses" && glassesClientArr.indexOf(client) >= 0) {
                    var gclient_1 = client;
                    console.log("眼镜断开连接！", gclient_1.gid);
                    //从眼镜在线列表中删除
                    glassesClientArr.splice(glassesClientArr.indexOf(gclient_1), 1);
                    /** 登记设备在线时长-退出 */
                    php.onlineTimeLength.emit({
                        appointed: gclient_1.gid,
                        type: 1
                    });
                    // 登记设备播放记录-退出
                    php.AppointedTime.emit({
                        appointed: gclient_1.gid,
                        type: 1
                    });
                    //调用PHP接口，获取当前眼镜关联的所有手机
                    php.deviceBindingList.emit({ appointed: gclient_1.gid }, function (d) {
                        if (d.code != 200)
                            return;
                        d.res.forEach(function (o) {
                            // 遍历手机列表，若手机在线则向其发送当前关联眼镜已经退出的消息
                            var p = getPhoneClient(o.appointed);
                            var isOnline = p != undefined;
                            if (isOnline) {
                                emit.serverEmitGlassesLoginChange(p, { is_login: false, gid: gclient_1.gid });
                            }
                        });
                    });
                }
                else if (client.activityId != undefined && client.userId != undefined) {
                    var lineClient = client;
                    console.log("lineLog日志客户端断开连接！");
                    php.lineLog.emit({
                        activityId: lineClient.activityId,
                        userId: lineClient.userId,
                        time: new Date().getTime(),
                        type: 1
                    });
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
                phpAddPhone();
                /** 调用PHP新增设备接口 */
                function phpAddPhone() {
                    php.AppointedAdd.emit({
                        appointed: d.pid,
                        data: d.data
                    }, function (d) {
                        if (d.code == 200) {
                            addPhone();
                        }
                        else {
                            //php服务器操作失败，返回php的ack
                            phpACK(ack, d);
                        }
                    });
                }
                /** 在Node层新增手机设备 */
                function addPhone() {
                    if (getPhoneClient(d.pid) == undefined) {
                        phoneClientArr.push(pclient);
                        getGlassesList();
                        registerOnlineTimeLength();
                        AppointedTimeStart();
                        return successACK(ack);
                    }
                    else {
                        return failACK(ack, tool.stringFormat("登录失败,手机ID({0})已存在", d.pid));
                    }
                }
                /** 获取当前手机关联的眼镜，并向当前手机发送关联的眼镜列表 */
                function getGlassesList() {
                    //调用PHP接口，获取当前手机关联的所有眼镜
                    php.deviceBindingList.emit({ appointed: pclient.pid }, function (d) {
                        if (d.code != 200)
                            return;
                        emit.serverEmitGlassesList(pclient, d.res.map(function (o) {
                            // 遍历眼镜列表，若眼镜在线则向其发送当前关联手机已经登录的消息
                            var g = getGlassesClient(o.appointed);
                            var isOnline = g != undefined;
                            if (isOnline) {
                                emit.serverEmitPhoneLoginChange(g, { is_login: true, pid: pclient.pid });
                            }
                            return createGlassesListItem(o.appointed, isOnline, o.data);
                        }));
                    });
                }
                /** 登记设备在线时长 */
                function registerOnlineTimeLength() {
                    php.onlineTimeLength.emit({
                        appointed: pclient.pid,
                        type: 0
                    }, function (d) { });
                }
                /** 登记设备播放记录-开始 */
                function AppointedTimeStart() {
                    php.AppointedTime.emit({
                        appointed: pclient.pid,
                        type: 0
                    });
                }
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
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
            },
            /**
             * 手机要关联指定眼镜
             *
             * @param {pg.phoneEmitBindGlassesData} d
             * @param {(ackData: pg.serverBase<pg.phoneEmitBindGlassesACK>) => void} ack
             */
            phoneEmitBindGlasses: function (d, ack) {
                var pclient = client;
                var gclient = getGlassesClient(d.gid);
                //调用PHP绑定设备记录接口
                php.deviceBindingLog.emit({
                    appointed: pclient.pid,
                    bonded_device: d.gid
                }, function (d) {
                    phpACK(ack, d);
                    //若php接口返回绑定成功，且被绑定设备在线，则发送已被绑定消息
                    if ((d.code == 200 || d.code == 608) && gclient != undefined) {
                        emit.serverEmitGlassesBinded(gclient, {
                            pid: pclient.pid
                        });
                    }
                });
            },
            /**
             * 手机加入会议(200001)
             */
            phoneEmitMeetingJoin: function (d, ack) {
                var pclient = client;
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitMeetingJoin(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
            },
            /**
             * 手机视频画面切换(200004)
             */
            phoneEmitMeetingScreenSwitch: function (d, ack) {
                var pclient = client;
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitMeetingScreenSwitch(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
            },
            /**
             * 手机与眼镜设备解绑(200008)
             */
            phoneEmitUnbind: function (d, ack) {
                var pclient = client;
                var gclient = getGlassesClient(d.gid);
                //向php服务器发送解绑消息
                php.unbind.emit({ appointed: d.gid, bonded_device: d.pid }, function (d) {
                    phpACK(ack, d);
                    emit.serverEmitSendToGlassesUnbind(gclient, d);
                });
            },
            /**
             * 手机直播推流(100001)
             */
            phoneEmitLivePush: function (d, ack) {
                var pclient = client;
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitLivePush(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
            },
            /**
             * 手机退出直播(100002)
             */
            phoneEmitLiveExit: function (d, ack) {
                var pclient = client;
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitLiveExit(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
            },
            /**
             * 手机设置导播台模式指令(100003)
             */
            phoneEmitLiveBroadcast: function (d, ack) {
                var pclient = client;
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitLiveBroadcast(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
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
                /** 调用PHP新增设备接口 */
                php.AppointedAdd.emit({
                    appointed: d.gid,
                    data: d.data
                }, function (d) {
                    if (d.code == 200) {
                        addGlasses();
                    }
                    else {
                        phpACK(ack, d);
                    }
                });
                /** 在Node层新增眼镜设备 */
                function addGlasses() {
                    if (getGlassesClient(d.gid) == undefined) {
                        glassesClientArr.push(gclient);
                        getPhoneList();
                        registerOnlineTimeLength();
                        AppointedTimeStart();
                        return successACK(ack);
                    }
                    else {
                        return failACK(ack, tool.stringFormat("登录失败,眼镜ID({0})已存在", d.gid));
                    }
                }
                /** 获取当前眼镜关联的所有手机，并向当前眼镜发送关联的手机列表 */
                function getPhoneList() {
                    // 获取当前眼镜关联的所有手机
                    php.deviceBindingList.emit({ appointed: gclient.gid }, function (d) {
                        if (d.code != 200)
                            return;
                        emit.serverEmitPhoneList(gclient, d.res.map(function (o) {
                            // 遍历手机列表，若手机在线则向其发送当前关联眼镜已经登录的消息
                            var p = getPhoneClient(o.appointed);
                            var isOnline = p != undefined;
                            if (isOnline) {
                                emit.serverEmitGlassesLoginChange(p, { is_login: true, gid: gclient.gid });
                            }
                            return createPhoneListItem(o.appointed, isOnline, o.data);
                        }));
                    });
                }
                /** 登记设备在线时长 */
                function registerOnlineTimeLength() {
                    php.onlineTimeLength.emit({
                        appointed: gclient.gid,
                        type: 0
                    }, function (d) { });
                }
                /** 登记设备播放记录-开始 */
                function AppointedTimeStart() {
                    php.AppointedTime.emit({
                        appointed: gclient.gid,
                        type: 0
                    });
                }
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
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },
            /**
             * 眼镜要关联指定手机ID
             *
             * @param {pg.glassesEmitBindPhoneData} d
             * @param {(ackData: pg.serverBase<pg.glassesEmitBindPhoneACK>) => void} ack
             */
            glassesEmitBindPhone: function (d, ack) {
                var gclient = client;
                var pclient = getPhoneClient(d.pid);
                //调用PHP绑定设备记录接口
                php.deviceBindingLog.emit({
                    appointed: gclient.gid,
                    bonded_device: d.pid
                }, function (d) {
                    phpACK(ack, d);
                    //若php接口返回绑定成功或返回已绑定，且被绑定设备在线，则发送已被绑定消息
                    if ((d.code == 200 || d.code == 608) && pclient != undefined) {
                        emit.serverEmitPhoneBinded(pclient, {
                            gid: gclient.gid
                        });
                    }
                });
            },
            /**
             * 眼镜获取是否有共享屏(200003)
             *
             * @param {any} d
             */
            glassesEmitMeetingIsShare: function (d, ack) {
                var gclient = client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitMeetingIsShare(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },
            /**
             * 眼镜wifi信息(200005)
             *
             * @param {any} d
             */
            glassesEmitWifiInfo: function (d, ack) {
                var gclient = client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitWifiInfo(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },
            /**
             * 眼镜硬件信息(200006)
             *
             * @param {any} d
             */
            glassesEmitDeviceInfo: function (d, ack) {
                var gclient = client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitDeviceInfo(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },
            /**
             * 眼镜获取视频环境(200007)
             *
             * @param {any} d
             */
            glassesEmitMeetingGetVideoEnv: function (d, ack) {
                var gclient = client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitMeetingGetVideoEnv(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },
            /**
             * 眼镜获取WIFI和电量状态指令(100005)
             *
             * @param {any} d
             */
            glassesEmitGetInfo: function (d, ack) {
                var gclient = client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitGetInfo(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    });
                    return successACK(ack);
                }
                else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },
            /**
             * 眼镜发送设备播放时间记录接口
             */
            glassesEmitAppointedTime: function (d, ack) {
                php.AppointedTime.emit(d, function (data) {
                    phpACK(ack, data);
                });
            },
            //--------------公共事件--------------
            /**
             * 客户端要获取指定手机ID数组的手机对象列表
             *
             * @param {pg.clientEmitGetPhoneListData} d
             * @param {(ackData: pg.serverBase<pg.clientEmitGetPhoneListACK>) => void} ack
             */
            clientEmitGetPhoneList: function (d, ack) {
                var arr = d.pids.map(function (pid) { return createPhoneListItem(pid, getIsPhoneOnline(pid)); });
                emit.serverEmitPhoneList(client, arr);
                //----------
                return successACK(ack);
            },
            /**
             * 客户端要获取指定眼镜ID数组的眼镜对象列表
             *
             * @param {pg.clientEmitGetGlassesListData} d
             * @param {(ackData: pg.serverBase<pg.clientEmitGetGlassesListACK>) => void} ack
             */
            clientEmitGetGlassesList: function (d, ack) {
                var arr = d.gids.map(function (gid) { return createGlassesListItem(gid, getIsGlassesOnline(gid)); });
                emit.serverEmitGlassesList(client, arr);
                //----------
                return successACK(ack);
            },
            /**
             * 客户端发送在线时长记录（已进入/打开时直接调用）
             *
             * @param  {pg.clientEmitLineLogData} d
             * @param  {(ackData:pg.serverBase<pg.clientEmitLineLogACK>)=>void} ack
             */
            clientEmitLineLog: function (d, ack) {
                var lineClient = client;
                lineClient.activityId = d.activityId;
                lineClient.userId = d.userId;
                php.lineLog.emit({
                    activityId: d.activityId,
                    userId: d.userId,
                    time: new Date().getTime(),
                    type: 0
                }, function (data) {
                    phpACK(ack, data);
                });
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
            serverEmitSendToGlasses: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 服务器发出给手机的消息
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitSendToPhone: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 服务器发出手机列表数据
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitPhoneListData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitPhoneListACK>) => void} ack
             */
            serverEmitPhoneList: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 服务器发出眼镜列表数据
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitGlassesListData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitGlassesListACK>) => void} ack
             */
            serverEmitGlassesList: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 手机加入会议(200001)
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitMeetingJoin: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 手机视频画面切换(200004)
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitMeetingScreenSwitch: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 手机直播推流(100001)
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitLivePush: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 手机退出直播(100002)
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitLiveExit: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 手机设置导播台模式指令(100003)
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitLiveBroadcast: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 眼镜获取是否有共享屏(200003)
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitMeetingIsShare: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 眼镜wifi信息(200005)
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitWifiInfo: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 眼镜硬件信息(200006)
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitDeviceInfo: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 眼镜获取视频环境(200007)
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitMeetingGetVideoEnv: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 眼镜获取WIFI和电量状态指令(100005)
             *
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitGetInfo: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 服务器发出，通知眼镜有手机登录状态变更
             */
            serverEmitPhoneLoginChange: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 服务器发出，通知手机有眼镜登录状态变更
             */
            serverEmitGlassesLoginChange: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 服务器发出，通知眼镜当前被解绑
             */
            serverEmitSendToGlassesUnbind: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 服务器发出，通知手机已被绑定
             */
            serverEmitPhoneBinded: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            },
            /**
             * 服务器发出，通知眼镜已被绑定
             */
            serverEmitGlassesBinded: function (socket, d, ack) {
                if (ack === void 0) { ack = noop; }
            }
        };
        /**
         * 将PHP接口的返回值给客户端的ack函数
         *
         * @param {Function} ack ack函数引用
         * @param {*} phpData php接口的返回值实体
         * @returns {void}
         */
        function phpACK(ack, phpData) {
            if (phpData === void 0) { phpData = null; }
            if (typeof ack !== "function")
                return;
            if (phpData == null) {
                return ack(createServerBase());
            }
            else {
                var code = phpData.code;
                //php接口的code为200是成功
                if (code == 200) {
                    code = 0;
                }
                return ack(createServerBase(code, phpData.msg || "", phpData.res));
            }
        }
        /**
         * 给客户端调用成功的ack函数
         *
         * @param {Function} ack
         */
        function successACK(ack, ackData) {
            if (ackData === void 0) { ackData = null; }
            if (typeof ack !== "function")
                return;
            if (ackData == null) {
                return ack(createServerBaseSuccess());
            }
            else {
                return ack(createServerBaseSuccess(ackData));
            }
        }
        /**
         * 给客户端调用失败的ack函数
         *
         * @param {Function} ack ack函数
         * @param {string} message 错误信息
         * @param {number} code 错误码,默认-1
         */
        function failACK(ack, message, code) {
            if (message === void 0) { message = ""; }
            if (code === void 0) { code = -1; }
            if (typeof ack !== "function")
                return;
            return ack(createServerBaseFail(message, code));
        }
        //=============
        //循环创建监听
        Object.keys(on).forEach(function (event) { return client.on(event, function () {
            var logArgs = [].slice.call(arguments);
            if (typeof logArgs[logArgs.length - 1] == "function") {
                logArgs[logArgs.length - 1] = "<ACK-Function>";
            }
            console.info.apply(console, [">>[on-" + event + "]"].concat(logArgs));
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
                console.info.apply(console, [">>[emit-" + event + "]"].concat(logArgs));
                //-------
                if (socket instanceof Array) {
                    socket.forEach(function (s) {
                        s.emit(event, d, ack);
                        logSendTo(s);
                    });
                }
                else {
                    socket.emit(event, d, ack);
                    logSendTo(socket);
                }
                function logSendTo(s) {
                    var c = s;
                    var phone = s;
                    var glasses = s;
                    console.info.apply(console, [">>[emit-" + event + "-to]"].concat([
                        c.type,
                        c.type == "phone" ? phone.pid : c.type == "glasses" ? glasses.gid : "<unknown>"
                    ]));
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
    function createServerBaseFail(failMess, code) {
        if (failMess === void 0) { failMess = "失败"; }
        if (code === void 0) { code = -1; }
        return createServerBase(code, failMess, null);
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
    function createPhoneListItem(pid, is_online, data) {
        if (data === void 0) { data = {}; }
        return {
            pid: pid,
            is_online: is_online,
            data: data
        };
    }
    /**
     * 创建眼镜列表对象数据
     *
     * @param {string} gid 眼镜ID
     * @param {boolean} is_online 是否在线
     * @returns {pg.serverEmitGlassesListItem}
     */
    function createGlassesListItem(gid, is_online, data) {
        if (data === void 0) { data = {}; }
        return {
            gid: gid,
            is_online: is_online,
            data: data
        };
    }
};
//# sourceMappingURL=phoneGlasses.js.map