import * as  socketio from 'socket.io';
import * as  _ from 'underscore';

export = function (httpServer) {

    /** socketio服务器 */
    var server: SocketIO.Server = socketio(httpServer);

    var phoneClientArr: pg.socketClient[] = [];

    var glassesClientArr: pg.socketClient[] = [];

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

                    // //从dic中删除对应关系
                    // Object.keys(glassesPhoneDic).forEach(gid => {
                    //     if (glassesPhoneDic[gid] == pclient.pid) {
                    //         delete glassesPhoneDic[gid];
                    //     }
                    // });
                }

                //如果断开的设备是眼镜
                if (client.type == "glasses" && glassesClientArr.indexOf(client) >= 0) {
                    let gclient: pg.glassesClient = <pg.glassesClient>client;
                    //从眼镜在线列表中删除
                    glassesClientArr.splice(glassesClientArr.indexOf(gclient), 1);

                    // //从dic中删除对应关系
                    // if (gclient.gid in glassesPhoneDic) {
                    //     delete glassesPhoneDic[gclient.gid];
                    // }
                }
            },


            //--------------手机事件--------------

            /**
             * 客户端手机登录
             * 
             * @param {any} d
             */
            phoneEmitLogin(d: pg.phoneEmitLoginData, ack: (ackData: pg.serverBase<pg.phoneEmitLoginACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
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
            phoneEmitSendToGlasses(d: pg.phoneEmitSendToGlassesData, ack: (ackData: pg.serverBase<pg.phoneEmitSendToGlassesACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
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
            phoneEmitBindGlasses(d: pg.phoneEmitBindGlassesData, ack: (ackData: pg.serverBase<pg.phoneEmitBindGlassesACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
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
            glassesEmitLogin(d: pg.glassesEmitLoginData, ack: (ackData: pg.serverBase<pg.glassesEmitLoginACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
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
            glassesEmitSendToPhone(d: pg.glassesEmitSendToPhoneData, ack: (ackData: pg.serverBase<pg.glassesEmitSendToPhoneACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
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
            glassesEmitBindPhone(d: pg.glassesEmitBindPhoneData, ack: (ackData: pg.serverBase<pg.glassesEmitBindPhoneACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
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
            clientEmitGetPhoneList(d: pg.clientEmitGetPhoneListData, ack: (ackData: pg.serverBase<pg.clientEmitGetPhoneListACK>) => void) {
                var arr: pg.serverEmitPhoneListData = d.pids.map(pid => createPhoneListItem(pid, getIsPhoneOnline(pid)));
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
            clientEmitGetGlassesList(d: pg.clientEmitGetGlassesListData, ack: (ackData: pg.serverBase<pg.clientEmitGetGlassesListACK>) => void) {
                var arr: pg.serverEmitGlassesListData = d.gids.map(gid => createGlassesListItem(gid, getIsGlassesOnline(gid)));
                emit.serverEmitGlassesList(client, arr, noop);
                //----------
                successACK(ack);
            },
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
            serverEmitSendToGlasses(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToGlassesData, ack: (ackData: pg.serverBase<pg.serverEmitSendToGlassesACK>) => void) { },

            /**
             * 服务器发出给手机的消息
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitSendToPhoneData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void} ack
             */
            serverEmitSendToPhone(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitSendToPhoneData, ack: (ackData: pg.serverBase<pg.serverEmitSendToPhoneACK>) => void) { },

            /**
             * 服务器发出手机列表数据
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitPhoneListData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitPhoneListACK>) => void} ack
             */
            serverEmitPhoneList(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitPhoneListData, ack: (ackData: pg.serverBase<pg.serverEmitPhoneListACK>) => void) { },

            /**
             * 服务器发出眼镜列表数据
             * 
             * @param {SocketIO.Socket|SocketIO.Socket[]} socket
             * @param {pg.serverEmitGlassesListData} d
             * @param {(ackData: pg.serverBase<pg.serverEmitGlassesListACK>) => void} ack
             */
            serverEmitGlassesList(socket: SocketIO.Socket | SocketIO.Socket[], d: pg.serverEmitGlassesListData, ack: (ackData: pg.serverBase<pg.serverEmitGlassesListACK>) => void) { },
        }


        /**
         * 给客户端调用ack函数
         * 
         * @param {Function} ack
         */
        function successACK(ack: Function, ackData: any = null) {
            if (typeof ack == "function") {
                if (ackData == null) {
                    ack(createServerBaseSuccess());
                } else {
                    ack(ackData);
                }
            }
        }

        //=============

        //循环创建监听
        Object.keys(on).forEach(event => client.on(event, function () {
            var logArgs: Array<any> = [].slice.call(arguments);
            if (typeof logArgs[logArgs.length - 1] == "function") {
                logArgs[logArgs.length - 1] = "<ACK-Function>";
            }
            console.info.apply(console, ["on-" + event].concat(logArgs));
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
                console.info.apply(console, ["emit-" + event].concat(logArgs));
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

    function createServerBaseFail(failMess: string = "失败") {
        return createServerBase(-1, failMess, null);
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
    function createPhoneListItem(pid: string, is_online: boolean): pg.serverEmitPhoneListItem {
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
    function createGlassesListItem(gid: string, is_online: boolean): pg.serverEmitGlassesListItem {
        return {
            gid: gid,
            is_online: is_online
        };
    }
}