declare namespace pg {
    /**
     * 聊天室的一个用户socket
     */
    interface socketClient extends SocketIO.Socket {
        /**
         * 当前客户端的类型，是手机还是眼镜
         * 
         * @type {"phone" | "glasses"}
         */
        type: "phone" | "glasses";
    }

    interface phoneClient extends socketClient {
        /**
         * 手机ID
         * 
         * @type {string}
         */
        pid: string;
    }

    interface glassesClient extends socketClient {
        /**
         * 眼镜ID
         * 
         * @type {string}
         */
        gid: string;

        /**
         * 当前眼镜关联的手机ID
         * 
         * @type {string}
         */
        pid: string;
    }
}

/** 客户端与服务器端接口通讯定义 */
declare namespace pg {

    /**
     * 服务器返回数据的所有实体的基础类
     * 
     * @interface serverBase
     * @template T
     */
    interface serverBase<T> {
        /**
         * 状态表示码，0为成功，非0为失败
         * 
         * @type {number}
         */
        code?: number;

        /**
         * 具体的数据内容
         * 
         * @type {T}
         */
        data?: T;

        /**
         * 信息文字
         * 
         * @type {string}
         */
        msg?: string;
    }

    /**
     * 手机登录提交的数据
     * 
     * @interface phoneEmitLoginData
     */
    interface phoneEmitLoginData {
        /**
         * 当前的手机ID
         * 
         * @type {string}
         */
        pid: string;
    }


    /**
     * 手机登录提交的数据ACK
     * 
     * @interface phoneEmitLoginACK
     */
    interface phoneEmitLoginACK {
        //无
    }

    /**
     * 手机发送消息给眼镜
     * 
     * @interface phoneEmitSendToGlassesData
     */
    interface phoneEmitSendToGlassesData {
        /**
         * 要发送给眼镜ID
         * 
         * @type {string}
         */
        gid: string;

        /**
         * 要发送给相应眼镜的实际数据
         * 
         * @type {*}
         * @memberOf phoneEmitSendToGlassesData
         */
        data: any;
    }

    /**
     * 手机发送消息给眼镜ACK
     * 
     * @interface phoneEmitSendToGlassesACK
     */
    interface phoneEmitSendToGlassesACK {
        //无
    }


    /**
     * 眼镜登录
     * 
     * @interface glassesEmitLoginData
     */
    interface glassesEmitLoginData {
        /**
         * 当前眼镜的ID
         * 
         * @type {string}
         * @memberOf glassesEmitLoginData
         */
        gid: string;

        /**
         * 当前眼镜关联的手机ID
         * 
         * @type {string}
         * @memberOf glassesEmitLoginData
         */
        pid: string;
    }

    /**
     * 眼镜登录ACK
     * 
     * @interface glassesEmitLoginACK
     */
    interface glassesEmitLoginACK {
        //无
    }

    /**
     * 眼镜发消息给手机
     * 
     * @interface glassesEmitSendToPhoneData
     */
    interface glassesEmitSendToPhoneData {
        /**
         * 眼镜发送给手机的实际数据
         * 
         * @type {*}
         * @memberOf glassesEmitSendToPhoneData
         */
        data: any;
    }

    /**
     * 眼镜发消息给手机ACK
     * 
     * @interface glassesEmitSendToPhoneACK
     */
    interface glassesEmitSendToPhoneACK {
        //无
    }
}