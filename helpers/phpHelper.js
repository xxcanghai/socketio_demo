"use strict";
var request = require('request');
var tool = require('./tool');
var _ = require("underscore");
var HOST = "http://event.dev.weidijia.cn";
var dic = {
    /** 51-设备绑定记录接口 */
    deviceBindingLog: createPhpInterface("/Api/DeviceBinding/log.html", "51-设备绑定记录接口", "POST"),
    /** 52-新增设备接口 */
    Appointed: createPhpInterface("/Api/Appointed/add.html", "52-新增设备接口", "POST"),
    /** 53-设备列表接口 */
    deviceBindingList: createPhpInterface("/Api/DeviceBinding/list.html", "53-设备列表接口", "POST"),
    /** 54-设备在线时长记录接口 */
    onlineTimeLength: createPhpInterface("/Api/Appointed/OnlineTimeLength.html", "54-设备在线时长记录接口", "POST")
};
/**
 * 创建一个PHP接口对象
 *
 * @param {string} path 接口路径
 * @param {string} desc 接口描述
 * @param {string} method 接口请求方式
 *
 */
function createPhpInterface(path, desc, method) {
    if (desc === void 0) { desc = ""; }
    if (method === void 0) { method = "POST"; }
    var obj = {};
    var noop = function () { };
    obj.path = path;
    obj.url = tool.urlCombine(HOST, path);
    obj.desc = desc;
    obj.method = method;
    obj.emit = function (data, callback) {
        if (callback === void 0) { callback = noop; }
        var submitData = {
            apiversion: "v.1.0",
            safecode: "video"
        };
        data = _.extend(submitData, data);
        /** request的配置对象 */
        var reqObj = {
            url: obj.url,
            method: obj.method,
            // qs: data,
            form: data
        };
        /** request的回调函数 */
        function success(error, response, body) {
            if (error) {
                throw error;
            }
            var data = JSON.parse(body);
            try {
                if (data.data_res.code != 200) {
                    console.error("PHP接口错误！", obj.desc, "接口地址：", reqObj.url, "提交数据：", reqObj.form, "错误信息：", data.data_res.msg);
                }
            }
            catch (ex) {
            }
            console.log(">>[phpReceive]", obj.desc, reqObj.url, reqObj.form, "返回值：", global.unescape(body.replace(/\\u/g, "%u")));
            callback.call(this, data.data_res);
        }
        console.log(">>[phpSend]", obj.desc, reqObj.url, reqObj.form);
        return request(reqObj, success);
    };
    return obj;
}
module.exports = dic;
//# sourceMappingURL=phpHelper.js.map