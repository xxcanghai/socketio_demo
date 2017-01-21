import * as  socketio from 'socket.io';
import * as  _ from 'underscore';
import * as tool from './tool';
import * as request from 'request';
import * as php from './phpHelper';
import config from './config';

export = function (httpServer) {

    /** socketio服务器 */
    var server: SocketIO.Server = socketio(httpServer);

    /** 所有手机socket列表 */
    var phoneClientArr: pg.socketClient[] = [];

    /** 所有眼镜socket列表 */
    var glassesClientArr: pg.socketClient[] = [];

    /** 专门用于记录在线时长的客户端列表 */
    var lineLogClinetArr: pg.lineLogClient[] = [];


    server.on("connection", function (client: pg.socketClient) {
        console.log("一个用户连接成功");
        var noop = function () { };

        /** 所有客户端监听事件集合 */
        var on = {
            /**
             * 客户端断开连接
             * 
             * @param {string} mess
             */
            disconnect(mess: string) {
                console.log("一个用户断开了连接");

                //如果断开的设备是手机
                if (client.type == "phone" && phoneClientArr.indexOf(client) >= 0) {
                    let pclient: pg.phoneClient = <pg.phoneClient>client;
                    // 从手机在线列表中删除
                    phoneClientArr.splice(phoneClientArr.indexOf(pclient), 1);
                    /** 登记设备在线时长-退出 */
                    php.onlineTimeLength.emit({
                        appointed: pclient.pid,
                        type: 1
                    });
                    // 登记设备播放记录-退出
                    php.AppointedTime.emit({
                        appointed: pclient.pid,
                        type: 1
                    });
                    //调用PHP接口，获取当前手机关联的所有眼镜
                    php.deviceBindingList.emit({ appointed: pclient.pid }, d => {
                        if (d.code != 200) return;
                        d.res.forEach(o => {
                            // 遍历眼镜列表，若眼镜在线则向其发送当前关联手机已经退出的消息
                            var g = getGlassesClient(o.bonded_device);
                            var isOnline = g != undefined;
                            if (isOnline) {
                                emit.serverEmitPhoneLoginChange(g, { is_login: false, pid: pclient.pid });
                            }
                        });
                    });
                }
                //如果断开的设备是眼镜 
                else if (client.type == "glasses" && glassesClientArr.indexOf(client) >= 0) {
                    let gclient: pg.glassesClient = <pg.glassesClient>client;
                    //从眼镜在线列表中删除
                    glassesClientArr.splice(glassesClientArr.indexOf(gclient), 1);
                    /** 登记设备在线时长-退出 */
                    php.onlineTimeLength.emit({
                        appointed: gclient.gid,
                        type: 1
                    });
                    // 登记设备播放记录-退出
                    php.AppointedTime.emit({
                        appointed: gclient.gid,
                        type: 1
                    });
                    //调用PHP接口，获取当前眼镜关联的所有手机
                    php.deviceBindingList.emit({ appointed: gclient.gid }, d => {
                        if (d.code != 200) return;
                        d.res.forEach(o => {
                            // 遍历手机列表，若手机在线则向其发送当前关联眼镜已经退出的消息
                            var p = getPhoneClient(o.bonded_device);
                            var isOnline = p != undefined;
                            if (isOnline) {
                                emit.serverEmitGlassesLoginChange(p, { is_login: false, gid: gclient.gid });
                            }
                        });
                    });
                }
                //如果是lineLog接口客户端
                else if ((<any>client).activityId != undefined && (<any>client).userId != undefined) {
                    let lineClient: pg.lineLogClient = <pg.lineLogClient><any>client;
  
                    php.lineLog.emit({
                        activityId: lineClient.activityId,
                        userId: lineClient.userId,
                        time: new Date().getTime(),
                        type: 1,
                    });
                }
            },


            //--------------手机事件--------------

            /**
             * 客户端手机登录
             * 
             * @param {any} d
             */
            phoneEmitLogin(d: pg.phoneEmitLoginData, ack: (ackData: pg.serverBase<pg.phoneEmitLoginACK>) => void): void {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
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
                        } else {
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
                        return successACK(ack);
                    } else {
                        return failACK(ack, tool.stringFormat("登录失败,手机ID({0})已存在", d.pid));
                    }
                }
                /** 获取当前手机关联的眼镜，并向当前手机发送关联的眼镜列表 */
                function getGlassesList() {
                    //调用PHP接口，获取当前手机关联的所有眼镜
                    php.deviceBindingList.emit({ appointed: pclient.pid }, d => {
                        if (d.code != 200) return;
                        emit.serverEmitGlassesList(pclient, d.res.map(o => {
                            // 遍历眼镜列表，若眼镜在线则向其发送当前关联手机已经登录的消息
                            var g = getGlassesClient(o.bonded_device);
                            var isOnline = g != undefined;
                            if (isOnline) {
                                emit.serverEmitPhoneLoginChange(g, { is_login: true, pid: pclient.pid });
                            }
                            return createGlassesListItem(o.bonded_device, isOnline, o.data)
                        }));
                    });
                }
                /** 登记设备在线时长 */
                function registerOnlineTimeLength() {
                    php.onlineTimeLength.emit({
                        appointed: pclient.pid,
                        type: 0
                    }, d => { });
                }
            },

            /**
             * 手机发送消息给眼镜
             * 
             * @param {any} d
             */
            phoneEmitSendToGlasses(d: pg.phoneEmitSendToGlassesData, ack: (ackData: pg.serverBase<pg.phoneEmitSendToGlassesACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitSendToGlasses(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
            },

            /**
             * 手机要关联指定眼镜
             * 
             * @param {pg.phoneEmitBindGlassesData} d
             * @param {(ackData: pg.serverBase<pg.phoneEmitBindGlassesACK>) => void} ack
             */
            phoneEmitBindGlasses(d: pg.phoneEmitBindGlassesData, ack: (ackData: pg.serverBase<pg.phoneEmitBindGlassesACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
                php.deviceBindingLog.emit({
                    appointed: pclient.pid,
                    bonded_device: d.gid
                }, function (d) {
                    phpACK(ack, d);
                });
            },

            /**
             * 手机加入会议(200001)
             */
            phoneEmitMeetingJoin(d: pg.phoneEmitSendToGlassesData, ack: (ackData: pg.serverBase<pg.phoneEmitSendToGlassesACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitMeetingJoin(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
            },

            /**
             * 手机视频画面切换(200004)
             */
            phoneEmitMeetingScreenSwitch(d: pg.phoneEmitSendToGlassesData, ack: (ackData: pg.serverBase<pg.phoneEmitSendToGlassesACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitMeetingScreenSwitch(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
            },

            /**
             * 手机与眼镜设备解绑(200008)
             */
            phoneEmitUnbind(d: pg.phoneEmitUnbindData, ack: (ackData: pg.serverBase<pg.phoneEmitUnbindACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
                var gclient = getGlassesClient(d.gid);

                //向php服务器发送解绑消息
                php.unbind.emit({ appointed: d.gid, bonded_device: d.pid }, function (d) {
                    phpACK(ack, d);
                });
            },

            /**
             * 手机直播推流(100001)
             */
            phoneEmitLivePush(d: pg.phoneEmitSendToGlassesData, ack: (ackData: pg.serverBase<pg.phoneEmitSendToGlassesACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitLivePush(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
            },

            /**
             * 手机退出直播(100002)
             */
            phoneEmitLiveExit(d: pg.phoneEmitSendToGlassesData, ack: (ackData: pg.serverBase<pg.phoneEmitSendToGlassesACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitLiveExit(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
            },

            /**
             * 手机设置导播台模式指令(100003)
             */
            phoneEmitLiveBroadcast(d: pg.phoneEmitSendToGlassesData, ack: (ackData: pg.serverBase<pg.phoneEmitSendToGlassesACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
                var gclient = getGlassesClient(d.gid);
                if (gclient) {
                    emit.serverEmitLiveBroadcast(gclient, {
                        pid: pclient.pid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定眼镜ID({0})不存在", d.gid));
                }
            },



            //--------------眼镜事件--------------


            /**
             * 客户端眼镜登录
             * 
             * @param {any} d
             */
            glassesEmitLogin(d: pg.glassesEmitLoginData, ack: (ackData: pg.serverBase<pg.glassesEmitLoginACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
                gclient.type = "glasses";
                gclient.gid = d.gid;

                /** 调用PHP新增设备接口 */
                php.AppointedAdd.emit({
                    appointed: d.gid,
                    data: d.data
                }, function (d) {
                    if (d.code == 200) {
                        addGlasses();
                    } else {
                        phpACK(ack, d);
                    }
                });
                /** 在Node层新增眼镜设备 */
                function addGlasses() {
                    if (getGlassesClient(d.gid) == undefined) {
                        glassesClientArr.push(gclient);
                        getPhoneList();
                        registerOnlineTimeLength();
                        return successACK(ack);
                    } else {
                        return failACK(ack, tool.stringFormat("登录失败,眼镜ID({0})已存在", d.gid));
                    }
                }
                /** 获取当前眼镜关联的所有手机，并向当前眼镜发送关联的手机列表 */
                function getPhoneList() {
                    // 获取当前眼镜关联的所有手机
                    php.deviceBindingList.emit({ appointed: gclient.gid }, d => {
                        if (d.code != 200) return;
                        emit.serverEmitPhoneList(gclient, d.res.map(o => {
                            // 遍历手机列表，若手机在线则向其发送当前关联眼镜已经登录的消息
                            var p = getPhoneClient(o.bonded_device);
                            var isOnline = p != undefined;
                            if (isOnline) {
                                emit.serverEmitGlassesLoginChange(p, { is_login: true, gid: gclient.gid });
                            }
                            return createPhoneListItem(o.bonded_device, isOnline, o.data);
                        }));
                    });
                }
                /** 登记设备在线时长 */
                function registerOnlineTimeLength() {
                    php.onlineTimeLength.emit({
                        appointed: gclient.gid,
                        type: 0
                    }, d => { });
                }
            },

            /**
             * 眼镜发送消息给手机
             * 
             * @param {any} d
             */
            glassesEmitSendToPhone(d: pg.glassesEmitSendToPhoneData, ack: (ackData: pg.serverBase<pg.glassesEmitSendToPhoneACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitSendToPhone(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },

            /**
             * 眼镜要关联指定手机ID
             * 
             * @param {pg.glassesEmitBindPhoneData} d
             * @param {(ackData: pg.serverBase<pg.glassesEmitBindPhoneACK>) => void} ack
             */
            glassesEmitBindPhone(d: pg.glassesEmitBindPhoneData, ack: (ackData: pg.serverBase<pg.glassesEmitBindPhoneACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
                php.deviceBindingLog.emit({
                    appointed: gclient.gid,
                    bonded_device: d.pid
                }, function (d) {
                    phpACK(ack, d);
                });
            },

            /**
             * 眼镜获取是否有共享屏(200003)
             * 
             * @param {any} d
             */
            glassesEmitMeetingIsShare(d: pg.glassesEmitSendToPhoneData, ack: (ackData: pg.serverBase<pg.glassesEmitSendToPhoneACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitMeetingIsShare(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },
            /**
             * 眼镜wifi信息(200005)
             * 
             * @param {any} d
             */
            glassesEmitWifiInfo(d: pg.glassesEmitSendToPhoneData, ack: (ackData: pg.serverBase<pg.glassesEmitSendToPhoneACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitWifiInfo(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },
            /**
             * 眼镜硬件信息(200006)
             * 
             * @param {any} d
             */
            glassesEmitDeviceInfo(d: pg.glassesEmitSendToPhoneData, ack: (ackData: pg.serverBase<pg.glassesEmitSendToPhoneACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitDeviceInfo(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },
            /**
             * 眼镜获取视频环境(200007)
             * 
             * @param {any} d
             */
            glassesEmitMeetingGetVideoEnv(d: pg.glassesEmitSendToPhoneData, ack: (ackData: pg.serverBase<pg.glassesEmitSendToPhoneACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitMeetingGetVideoEnv(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },
            /**
             * 眼镜获取WIFI和电量状态指令(100005)
             * 
             * @param {any} d
             */
            glassesEmitGetInfo(d: pg.glassesEmitSendToPhoneData, ack: (ackData: pg.serverBase<pg.glassesEmitSendToPhoneACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
                var pclient = getPhoneClient(d.pid);
                if (pclient) {
                    emit.serverEmitGetInfo(pclient, {
                        gid: gclient.gid,
                        data: d.data
                    });
                    return successACK(ack);
                } else {
                    return failACK(ack, tool.stringFormat("发送消息失败,指定手机({0})不存在", d.pid));
                }
            },

            /**
             * 眼镜发送设备播放时间记录接口
             */
            glassesEmitAppointedTime(d: pg.glassesEmitAppointedTimeData, ack: (ackData: pg.serverBase<pg.glassesEmitAppointedTimeACK>) => void) {
                php.AppointedTime.emit(d, data => {
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
            clientEmitGetPhoneList(d: pg.clientEmitGetPhoneListData, ack: (ackData: pg.serverBase<pg.clientEmitGetPhoneListACK>) => void) {
                var arr: pg.serverEmitPhoneListData = d.pids.map(pid => createPhoneListItem(pid, getIsPhoneOnline(pid)));
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
            clientEmitGetGlassesList(d: pg.clientEmitGetGlassesListData, ack: (ackData: pg.serverBase<pg.clientEmitGetGlassesListACK>) => void) {
                var arr: pg.serverEmitGlassesListData = d.gids.map(gid => createGlassesListItem(gid, getIsGlassesOnline(gid)));
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
            clientEmitLineLog(d: pg.clientEmitLineLogData, ack: (ackData: pg.serverBase<pg.clientEmitLineLogACK>) => void) {
                var lineClient: pg.lineLogClient = <pg.lineLogClient><any>client;
                lineClient.activityId = d.activityId;
                lineClient.userId = d.userId;

                php.lineLog.emit({
                    activityId: d.activityId,
                    userId: d.userId,
                    time: new Date().getTime(),
                    type: 0,
                }, data => {
                    phpACK(ack, data);
                });
            }

            // 【手机发送事件名】
            // phoneEmitMeetingJoin, 手机加入会议(200001)
            // phoneEmitMeetingScreenSwitch, 手机视频画面切换(200004)
            // phoneEmitUnbind, 手机与眼镜设备解绑(200008) 原名 phoneEmitMeetingUnbind
            // phoneEmitLivePush, 手机直播推流(100001)
            // phoneEmitLiveExit, 手机退出直播(100002)
            // phoneEmitLiveBroadcast, 手机设置导播台模式指令(100003)

            // 【眼镜发送事件名】
            // glassesEmitMeetingIsShare, 眼镜获取是否有共享屏(200003)
            // glassesEmitWifiInfo, 眼镜wifi信息(200005)
            // glassesEmitDeviceInfo, 眼镜硬件信息(200006)
            // glassesEmitMeetingGetVideoEnv, 眼镜获取视频环境(200007)
            // glassesEmitGetInfo, 眼镜获取WIFI和电量状态指令(100005)


            // 对应服务器发送事件名：
            // （眼镜端监听）
            // serverEmitMeetingJoin
            // serverEmitMeetingScreenSwitch
            // serverEmitLivePush
            // serverEmitLiveExit
            // serverEmitLiveBroadcast

            // （手机端监听）
            // serverEmitMeetingIsShare
            // serverEmitWifiInfo
            // serverEmitDeviceInfo
            // serverEmitMeetingGetVideoEnv
            // serverEmitGetInfo

        }

        /** 所有服务器发出的事件集合 */
        var emit = {
            /**
             * 服务器发出给眼镜的消息
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitSendToGlasses(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToGlassesData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void = noop) { },

            /**
             * 服务器发出给手机的消息
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitSendToPhone(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToPhoneData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void = noop) { },

            /**
             * 服务器发出手机列表数据
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitPhoneListData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitPhoneListACK>) => void} ack
             */
            serverEmitPhoneList(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitPhoneListData, ack: (ackData?: pg.serverBase<pg.serverEmitPhoneListACK>) => void = noop) { },

            /**
             * 服务器发出眼镜列表数据
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitGlassesListData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitGlassesListACK>) => void} ack
             */
            serverEmitGlassesList(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitGlassesListData, ack: (ackData?: pg.serverBase<pg.serverEmitGlassesListACK>) => void = noop) { },

            /**
             * 手机加入会议(200001)
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitMeetingJoin(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToGlassesData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void = noop) { },

            /**
             * 手机视频画面切换(200004)
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitMeetingScreenSwitch(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToGlassesData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void = noop) { },

            /**
             * 手机直播推流(100001)
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitLivePush(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToGlassesData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void = noop) { },

            /**
             * 手机退出直播(100002)
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitLiveExit(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToGlassesData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void = noop) { },

            /**
             * 手机设置导播台模式指令(100003)
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToGlassesData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void} [ack=noop]
             */
            serverEmitLiveBroadcast(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToGlassesData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void = noop) { },


            /**
             * 眼镜获取是否有共享屏(200003)
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitMeetingIsShare(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToPhoneData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void = noop) { },

            /**
             * 眼镜wifi信息(200005)
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitWifiInfo(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToPhoneData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void = noop) { },

            /**
             * 眼镜硬件信息(200006)
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitDeviceInfo(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToPhoneData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void = noop) { },

            /**
             * 眼镜获取视频环境(200007)
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitMeetingGetVideoEnv(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToPhoneData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void = noop) { },

            /**
             * 眼镜获取WIFI和电量状态指令(100005)
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitGetInfo(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToPhoneData, ack: (ackData?: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void = noop) { },

            /**
             * 服务器发出，通知眼镜有手机登录状态变更
             */
            serverEmitPhoneLoginChange(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitPhoneLoginChangeData, ack: (ackData?: pg.serverBase<pg.serverEmitPhoneLoginChangeACK>) => void = noop) { },

            /**
             * 服务器发出，通知手机有眼镜登录状态变更
             */
            serverEmitGlassesLoginChange(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitGlassesLoginChangeData, ack: (ackData?: pg.serverBase<pg.serverEmitGlassesLoginChangeACK>) => void = noop) { },
        }

        /**
         * 将PHP接口的返回值给客户端的ack函数
         * 
         * @param {Function} ack ack函数引用
         * @param {*} phpData php接口的返回值实体
         * @returns {void}
         */
        function phpACK(ack: Function, phpData: any = null): void {
            if (typeof ack !== "function") return;
            if (phpData == null) {
                return ack(createServerBase());
            } else {
                let code = phpData.code;
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
        function successACK(ack: Function, ackData: any = null): void {
            if (typeof ack !== "function") return;
            if (ackData == null) {
                return ack(createServerBaseSuccess());
            } else {
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
        function failACK(ack: Function, message: string = "", code: number = -1): void {
            if (typeof ack !== "function") return;
            return ack(createServerBaseFail(message, code));
        }

        //=============

        //循环创建监听
        Object.keys(on).forEach(event => client.on(event, function () {
            var logArgs: Array<any> = [].slice.call(arguments);
            if (typeof logArgs[logArgs.length - 1] == "function") {
                logArgs[logArgs.length - 1] = "<ACK-Function>";
            }
            console.info.apply(console, [">>[on-" + event + "]"].concat(logArgs));
            //--------------
            var args: Array<any> = [].slice.call(arguments);
            return (<Function>on[event]).apply(this, args);
        }));

        //循环重写emit发出事件函数
        Object.keys(emit).forEach(event => {
            emit[event] = function (socket: SocketIO.Socket | SocketIO.Socket[], d: any, ack: Function = noop) {
                var logArgs: Array<any> = [].slice.call(arguments, 1);
                if (typeof logArgs[logArgs.length - 1] == "function") {
                    logArgs[logArgs.length - 1] = "<ACK-Function>";
                }
                console.info.apply(console, [">>[emit-" + event + "]"].concat(logArgs));
                //-------
                if (socket instanceof Array) {
                    socket.forEach(s => s.emit(event, d, ack));
                } else {
                    socket.emit(event, d, ack);
                }
            }
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
    function createServerBase<T>(code: number = 0, msg: string = "", data: T = null): pg.serverBase<T> {
        return {
            code: code,
            msg: msg,
            data: data
        }
    }

    function createServerBaseSuccess(data: any = null) {
        return createServerBase(0, "成功", data);
    }

    function createServerBaseFail(failMess: string = "失败", code: number = -1) {
        return createServerBase(code, failMess, null);
    }

    /**
     * 返回指定眼镜ID的眼镜client连接
     * 
     * @param {string} gid 眼镜ID
     * @returns {pg.glassesClient}
     */
    function getGlassesClient(gid: string): pg.glassesClient {
        return <pg.glassesClient>glassesClientArr.filter((c: pg.glassesClient) => c.gid == gid)[0];
    }

    /**
     * 返回指定手机ID的手机client连接
     * 
     * @param {string} pid 手机ID
     * @returns {pg.phoneClient}
     */
    function getPhoneClient(pid: string): pg.phoneClient {
        return <pg.phoneClient>phoneClientArr.filter((c: pg.phoneClient) => c.pid == pid)[0];
    }

    /**
     * 获取指定眼镜ID是否在线
     * 
     * @param {string} gid 眼镜ID
     * @returns {boolean}
     */
    function getIsGlassesOnline(gid: string): boolean {
        return getGlassesClient(gid) != undefined;
    }

    /**
     * 获取指定手机ID是否在线
     * 
     * @param {string} pid 手机ID
     * @returns {boolean}
     */
    function getIsPhoneOnline(pid: string): boolean {
        return getPhoneClient(pid) != undefined;
    }

    /**
     * 根据眼镜ID数组，返回眼镜client数组
     * 
     * @param {string[]} gids 眼镜ID数组
     * @param {boolean} isOnlyOnline 是否默认只返回当前在线的client对象，默认为true，若传false则返回的client数组中可能包括undefined对象（即未在线客户端）
     * @returns {pg.glassesClient[]}
     */
    function getGlassesClientArr(gids: string[], isOnlyOnline: boolean = true): pg.glassesClient[] {
        return gids.map(gid => getGlassesClient(gid)).filter(c => isOnlyOnline ? c != undefined : true);
    }

    /**
     * 根据手机ID数组，返回手机client数组
     * 
     * @param {string[]} pids 手机ID数组
     * @param {boolean} isOnlyOnline 是否默认只返回当前在线的client对象，默认为true，若传false则返回的client数组中可能包括undefined对象（即未在线客户端）
     * @returns {pg.phoneClient[]}
     */
    function getPhoneClientArr(pids: string[], isOnlyOnline: boolean = true): pg.phoneClient[] {
        return pids.map(pid => getPhoneClient(pid)).filter(c => isOnlyOnline ? c != undefined : true);
    }

    /**
     * 创建手机列表对象数据
     * 
     * @param {string} pid 手机ID
     * @param {boolean} is_online 是否在线
     * @returns {pg.serverEmitPhoneListItem}
     */
    function createPhoneListItem(pid: string, is_online: boolean, data: any = {}): pg.serverEmitPhoneListItem {
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
    function createGlassesListItem(gid: string, is_online: boolean, data: any = {}): pg.serverEmitGlassesListItem {
        return {
            gid: gid,
            is_online: is_online,
            data: data
        };
    }


}