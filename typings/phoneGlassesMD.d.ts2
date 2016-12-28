

/** 客户端与服务器端接口通讯定义 */
declare namespace pg {

    /**
     * 服务器返回数据的所有实体的基础类
     * @template T
     */
    interface serverBase<T> {
        /**
         * 状态表示码，0为成功，非0为失败
         */
        code?: number;

        /**
         * 具体的数据内容
         */
        data?: T;

        /**
         * 信息文字
         */
        msg?: string;
    }

    /**
     * 手机登录提交的数据
     */
    interface phoneEmitLoginData {
        /**
         * 当前的手机ID
         */
        pid: string;
    }

    interface phoneEmitLoginACK {
        //无
    }

    /**
     * 手机发送消息给眼镜
     */
    interface phoneEmitSendToGlassesData {
        /**
         * 要发送给眼镜ID
         */
        gid: string;

        /**
         * 要发送给相应眼镜的实际数据
         */
        data: any;
    }

    interface phoneEmitSendToGlassesACK {
        //无
    }

    /**
     * 眼镜登录
     */
    interface glassesEmitLoginData {
        /**
         * 当前眼镜的ID
         */
        gid: string;
    }

    interface glassesEmitLoginACK {
        //无
    }

    /**
     * 眼镜与指定手机ID建立绑定关系
     */
    interface glassesEmitBindPhoneData {
        /**
         * 眼镜要建立绑定关系的手机ID
         */
        pid: string;
    }

    interface glassesEmitBindPhoneACK {
        //无
    }

    /**
     * 手机与指定眼镜ID建立绑定关系
     */
    interface phoneEmitBindGlassesData {
        /**
         * 手机要建立绑定关系的眼镜ID
         */
        gid: string;
    }

    interface phoneEmitBindGlassesACK {
        //无
    }

    /**
     * 眼镜发消息给手机
     */
    interface glassesEmitSendToPhoneData {
        /**
         * 要接受的手机ID
         */
        pid: string;

        /**
         * 眼镜发送给手机的实际数据
         */
        data: any;
    }

    interface glassesEmitSendToPhoneACK {
        //无
    }

    /**
     * 任意客户端发起获取指定手机ID数组的手机对象列表
     */
    interface clientEmitGetPhoneListData {
        /**
         * 手机ID数组
         */
        pids: string[];
    }

    interface clientEmitGetPhoneListACK {
        //无
    }

    /**
     * 任意客户端发起获取指定眼镜ID数组的眼镜对象列表
     */
    interface clientEmitGetGlassesListData {
        /**
         * 眼镜ID数组
         */
        gids: string[];
    }

    interface clientEmitGetGlassesListACK {
        //无
    }
}

/** 服务器发出的事件 */
declare namespace pg {

    /**
     * 服务器发出手机列表数组
     */
    interface serverEmitPhoneListData extends Array<serverEmitPhoneListItem> {
    }

    /**
     * 服务器发出手机列表对象
     */
    interface serverEmitPhoneListItem {
        /**
         * 手机是否在线
         */
        is_online: boolean;

        /**
         * 手机ID
         */
        pid: string;
    }

    interface serverEmitPhoneListACK {
        //无
    }


    /**
     * 服务器发出眼镜列表数组
     */
    interface serverEmitGlassesListData extends Array<serverEmitGlassesListItem> {
    }

    /**
     * 服务器发出眼镜列表对象
     */
    interface serverEmitGlassesListItem {

        /**
         * 眼镜是否在线
         */
        is_online: boolean;

        /**
         * 眼镜ID
         */
        gid: string;
    }

    interface serverEmitGlassesListACK {
        //无
    }


    /**
     * 服务器发出给眼镜的消息
     */
    interface serverEmitSendToGlassesData {
        /**
         * 发送此消息的手机ID
         */
        pid: string;

        /**
         * 具体发送的数据
         */
        data: any;
    }

    interface serverEmitSendToGlassesACK {
        //无
    }

    /**
     * 服务器发出给手机的消息
     */
    interface serverEmitSendToPhoneData {

        /**
         * 发送此消息的眼镜ID
         */
        gid: string;

        /**
         * 具体发送的数据
         */
        data: any;
    }

    interface serverEmitSendToPhoneACK {
        //无
    }
}