import * as request from 'request';
import * as http from 'http';
import * as tool from './tool';
import * as _ from "underscore";

const HOST = "http://event.dev.weidijia.cn";


var dic = {
    /** 51-设备绑定记录接口 */
    deviceBindingLog: createPhpInterface<pg.deviceBindingLogIn, pg.deviceBindingLogOut>
        ("/Api/DeviceBinding/log.html", "51-设备绑定记录接口", "POST"),
    /** 52-新增设备接口 */
    Appointed: createPhpInterface<pg.AppointedIn, pg.AppointedOut>
        ("/Api/Appointed/add.html", "52-新增设备接口", "POST"),
    /** 53-设备列表接口 */
    deviceBindingList: createPhpInterface<pg.deviceBindingListIn, pg.deviceBindingListOut>
        ("/Api/DeviceBinding/list.html", "53-设备列表接口", "POST"),
    /** 54-设备在线时长记录接口 */
    onlineTimeLength: createPhpInterface<pg.onlineTimeLengthIn, pg.onlineTimeLengthOut>
        ("/Api/Appointed/OnlineTimeLength.html", "54-设备在线时长记录接口", "POST"),
};

/**
 * 创建一个PHP接口对象
 * 
 * @param {string} path 接口路径
 * @param {string} desc 接口描述
 * @param {string} method 接口请求方式
 * 
 */
function createPhpInterface<T, U>(path: string, desc: string = "", method: "POST" | "GET" = "POST"): pg.phpInterface<T, U> {
    var obj = <pg.phpInterface<T, U>>{};
    var noop = function () { };
    obj.path = path;
    obj.url = tool.urlCombine(HOST, path);
    obj.desc = desc;
    obj.method = method;
    obj.emit = function (data: T, callback: (d: U) => void = noop): request.Request {
        type requestConfig = request.CoreOptions & request.UrlOptions;

        var submitData: pg.phpInBase = {
            apiversion: "v.1.0",
            safecode: "video"
        }
        data = _.extend(submitData, data);

        /** request的配置对象 */
        var reqObj: requestConfig = {
            url: obj.url,
            method: obj.method,
            // qs: data,
            form: data,
            // body: data,
        };

        /** request的回调函数 */
        function success(error: any, response: http.IncomingMessage, body: any) {
            if (error) { throw error }
            var data: any = JSON.parse(body);
            try {
                if (data.data_res.code != 200) {
                    console.error("PHP接口错误！", obj.desc, "接口地址：", reqObj.url, "提交数据：", reqObj.form, "错误信息：", data.data_res.msg);
                }
            }
            catch (ex) {
            }
            console.log(">>[phpReceive]", obj.desc, reqObj.url, reqObj.form, "返回值：", data);
            callback.call(this, data.data_res);
        }
        console.log(">>[phpSend]", obj.desc, reqObj.url, reqObj.form);
        return request(reqObj, success);
    }

    return obj;
}


namespace pg {
    /**
     * PHP接口对象，泛型T为接口输入提交数据，泛型U为接口返回值
     * 
     * @export
     * @interface phpInterface
     * @template T
     * @template U
     */
    export interface phpInterface<T, U> {
        /**
         * 接口完成URL地址
         * 
         * @type {string}
         */
        url: string;

        /**
         * 接口中文说明
         * 
         * @type {string}
         */
        desc: string;

        /**
         * 接口的path路径部分（不包含域名）
         * 
         * @type {string}
         */
        path: string;

        /**
         * 接口的请求方式，默认POST
         * 
         * @type {string}
         */
        method: "POST" | "GET";

        /**
        * 发出请求
        * 
        * @param {T} data 要发送的数据
        * @param {Functiion} callback 回调函数
        * @returns {request.Request}
        */
        emit(data: T, callback?: (d: U) => void): request.Request;
    }


    /**
     * PHP接口的输入参数实体基类
     * 
     * @export
     * @interface phpInBase
     */
    export interface phpInBase {
        /**
         * 版本号
         * 
         * @type {string}
         * @memberOf phpInBase
         */
        apiversion: string;
        /**
         * 加密参数
         * 
         * @type {string}
         * @memberOf phpInBase
         */
        safecode: string;
    }

    /**
     * PHP接口返回值的实体基类
     * 
     * @export
     * @interface phpOutBase
     * @template T
     */
    export interface phpOutBase<T> {
        // data_res?: {
        /**
         * 状态码 200为成功，非200为失败
         * 
         * @type {number}
         */
        code: number;

        /**
         * 返回值实体,仅在成功时有此字段
         * 
         * @type {T}
         */
        res: T;

        /**
         * 错误信息，仅在失败时有此字段
         * 
         * @type {string}
         */
        msg: string;
        // }
    }

    export interface deviceBindingLogIn {
        /**
         * 发起绑定设备
         * 
         * @type {string}
         * @memberOf deviceBindingIn
         */
        appointed: string;
        /**
         * 被绑定设备
         * 
         * @type {string}
         * @memberOf deviceBindingIn
         */
        bonded_device: string;
    }

    export interface deviceBindingLogOut extends phpOutBase<string> { }

    export interface AppointedIn {
        /**
         * 设备名称
         * 
         * @type {string}
         */
        name: string;

        /**
         * 设备ID
         * 
         * @type {string}
         */
        appointed: string;
    }

    export interface AppointedOut extends phpOutBase<string> { }

    export interface deviceBindingListIn {
        /**
         * 设备ID
         * 
         * @type {string}
         * @memberOf deviceBindingListIn
         */
        appointed: string;
    }
    export interface deviceBindingListOut extends phpOutBase<deviceBindingListItem[]> {
    }

    export interface deviceBindingListItem {
        /**
         * 记录编号，无用
         * 
         * @type {string}
         */
        id: string;
        /**
         * 设备名称
         * 
         * @type {string}
         */
        name: string;
        /**
         * 被绑定设备ID 
         * 
         * @type {string}
         */
        bonded_device: string;
    }

    export interface onlineTimeLengthIn {
        /**
         * 设备ID
         * 
         * @type {string}
         */
        appointed: string;

        /**
         * 状态，0登录，1退出
         * 
         * @type null
         */
        type: 0 | 1 | number;
    }

    export interface onlineTimeLengthOut extends phpOutBase<string> { }
}

export = dic;