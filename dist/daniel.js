"use strict";
// This file is for the Oddcast API calls
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeCall = void 0;
var node_fetch_1 = require("node-fetch");
var crypto = require("crypto");
function getMd5Hash(string) {
    var md5Sum = crypto.createHash('md5');
    md5Sum.update(string);
    return md5Sum.digest('hex');
}
// Reverse-engineering of the 'demo' api used on http://ttsdemo.com (max ~600 chars)
// No known request-limit
function getChecksum(text, engine, language, voice, acc) {
    if (engine === void 0) { engine = 4; }
    if (language === void 0) { language = 1; }
    if (voice === void 0) { voice = 5; }
    if (acc === void 0) { acc = 5883747; }
    return getMd5Hash("" + engine + language + voice + text + '1' + 'mp3' + acc + 'uetivb9tb8108wfj');
}
function getTextPromise(engine, language, voice, text, acc, checksum) {
    return node_fetch_1.default("http://cache-a.oddcast.com/tts/gen.php?EID=" + engine + "&LID=" + language + "&VID=" + voice + "&TXT=" + text + "&IS_UTF8=1&EXT=mp3&FNAME&ACC=" + acc + "&API&SESSION&CS=" + checksum + "&cache_flag=3", {
        headers: {
            'Host': 'cache-a.oddcast.com',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:66.0) Gecko/20100101 Firefox/66.0',
            'Accept': 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5',
            'Accept-Language': 'sv-SE,sv;q=0.8,en-US;q=0.5,en;q=0.3',
            'Range': 'bytes=0-',
            'Referer': 'http://www.oddcast.com/ttsdemo/index.php',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Cookie': 'lastLoginURL=https%3A%2F%2Fvhss.oddcast.com%2Fadmin%2F%3F; y=esAHc9ANyahS30fiLAc00',
        },
    }).then(function (res) {
        if (res.headers.get('Content-Type') === 'audio/mpeg') {
            return res;
        }
        else {
            console.log("Got Content-Type:", res.headers.get('Content-Type'));
            console.error('An error ocurred with Daniel on:', text);
            throw new Error("400");
        }
    }).catch(function (err) {
        console.error("Daniel: Request failed");
        throw err;
    });
}
// Make call will return a request with the mp3 file
// "text" cannot include some characters, like [><\n]
// Usually takes between 2-5 seconds
function makeCall(text, engine, language, voice) {
    if (engine === void 0) { engine = 4; }
    if (language === void 0) { language = 1; }
    if (voice === void 0) { voice = 5; }
    return __awaiter(this, void 0, void 0, function () {
        var newtext, acc, checksum, tries, _loop_1, state_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    text = text
                        .replace(/&/g, ' and ') // '&' doesn't work for Daniel, he says &amp instead
                        .replace(/[<>]/g, '') // < and > makes the request fail
                        // .replace('\n', '')
                        .split("\n")
                        .map(function (line) { return line.trim(); })
                        .map(function (line) { return line[0].toUpperCase() + line.slice(1) + " ("; })
                        .join("\n");
                    newtext = encodeURIComponent(text);
                    acc = 5883747;
                    checksum = getChecksum(text, engine, language, voice, acc);
                    tries = 0;
                    _loop_1 = function () {
                        var p, t, err_1, retrytime_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    tries++;
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 3, , 5]);
                                    p = getTextPromise(engine, language, voice, newtext, acc, checksum);
                                    return [4 /*yield*/, timeoutPromise(5000, p)];
                                case 2:
                                    t = _a.sent();
                                    return [2 /*return*/, { value: t }];
                                case 3:
                                    err_1 = _a.sent();
                                    if (err_1.message == 400 && tries > 3) {
                                        throw err_1;
                                    }
                                    retrytime_1 = 1000;
                                    console.error("Daniel: Request failed. Retrying again in " + retrytime_1 / 1000 + " seconds...");
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, retrytime_1); })]; // Wait
                                case 4:
                                    _a.sent(); // Wait
                                    return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    };
                    _a.label = 1;
                case 1:
                    if (!(tries < 1000)) return [3 /*break*/, 3];
                    return [5 /*yield**/, _loop_1()];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    return [3 /*break*/, 1];
                case 3: throw new Error("Daniel: Too many failed attempts, skipping");
            }
        });
    });
}
exports.makeCall = makeCall;
// Takes a timeout and a promise, rejects promise if promise is not resolved within the timespan
function timeoutPromise(ms, promise) {
    return new Promise(function (resolve, reject) {
        var timeoutId = setTimeout(function () {
            reject(new Error("promise timeout"));
        }, ms);
        promise.then(function (res) {
            clearTimeout(timeoutId);
            resolve(res);
        }, function (err) {
            clearTimeout(timeoutId);
            reject(err);
        });
    });
}
