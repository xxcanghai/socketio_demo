import * as  socketio from 'socket.io';

export = function chatroomio(httpServer) {

    /** socketio服务器 */
    var server: SocketIO.Server = socketio(httpServer);

    /** 眼镜和手机的字典（眼镜ID为key，手机ID为value） */
    var glassesPhoneDic: { [key: string]: string } = {};

    var phoneClientArr: pg.socketClient[] = [];

    var glassesClientArr: pg.socketClient[] = [];

    server.on("connection", function (client: pg.socketClient) {
        console.log("一个用户连接成功");


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

                    //从dic中删除对应关系
                    Object.keys(glassesPhoneDic).forEach(gid => {
                        if (glassesPhoneDic[gid] == pclient.pid) {
                            delete glassesPhoneDic[gid];
                        }
                    });
                }

                //如果断开的设备是眼镜
                if (client.type == "glasses" && glassesClientArr.indexOf(client) >= 0) {
                    let gclient: pg.glassesClient = <pg.glassesClient>client;
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
            phoneEmitLogin(d: pg.phoneEmitLoginData, ack: (ackData: pg.serverBase<pg.phoneEmitLoginACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
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
            phoneEmitSendToGlasses(d: pg.phoneEmitSendToGlassesData, ack: (ackData: pg.serverBase<pg.phoneEmitSendToGlassesACK>) => void) {
                var pclient: pg.phoneClient = <pg.phoneClient>client;
                //------
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
            glassesEmitSendToPhone(d: pg.glassesEmitSendToPhoneData, ack: (ackData: pg.serverBase<pg.glassesEmitSendToPhoneACK>) => void) {
                var gclient: pg.glassesClient = <pg.glassesClient>client;
                //--------
                successACK(ack);
            }
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
        Object.keys(on).forEach(event => client.on(event, on[event]));
    });
}

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

