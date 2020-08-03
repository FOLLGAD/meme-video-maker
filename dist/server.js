"use strict";
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
var fs_1 = require("fs");
var tmp_promise_1 = require("tmp-promise");
var uuid_1 = require("uuid");
var video_1 = require("./video");
var vision_1 = require("./vision");
var Koa = require("koa");
var Router = require("koa-router");
var tmp = require("tmp");
var cors = require("@koa/cors");
// Load env variables
require('dotenv').config();
// AWS
var AWS = require("aws-sdk");
// AWS S3
var s3 = new AWS.S3();
// AWS DynamoDB
var dynamodb = new AWS.DynamoDB({
    apiVersion: '2012-08-10',
    region: 'eu-central-1',
});
// S3 Buckets
var Bucket = '4chan-app';
var FilesBucket = '4chan-files';
// DynamoDB table
var dbThemeName = '4chan-themes';
// setup multipart upload for koa
var uploadDir = tmp.dirSync();
var koaMultiBody = require("koa-body");
var koaBody = koaMultiBody({ multipart: true, formidable: { uploadDir: uploadDir.path } });
var koaBodyParser = require("koa-bodyparser");
var bodyParser = koaBodyParser();
var app = new Koa();
var router = new Router();
app.use(cors());
var cache = new Map();
function getFile(s3_key) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(cache.has(s3_key) && fs_1.existsSync(cache.get(s3_key).path))) return [3 /*break*/, 1];
                    return [2 /*return*/, cache.get(s3_key).path];
                case 1: return [4 /*yield*/, new Promise(function (res, rej) { return s3.getObject({
                        Bucket: FilesBucket,
                        Key: s3_key,
                    }, function (err, data) { return __awaiter(_this, void 0, void 0, function () {
                        var f;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    if (err || !data.Body)
                                        return [2 /*return*/, rej(err)];
                                    return [4 /*yield*/, tmp_promise_1.file({ postfix: s3_key })
                                        //@ts-ignore because it always works anyways
                                    ];
                                case 1:
                                    f = _a.sent();
                                    //@ts-ignore because it always works anyways
                                    fs_1.writeFileSync(f.path, data.Body);
                                    cache.set(s3_key, f);
                                    res(f.path);
                                    return [2 /*return*/];
                            }
                        });
                    }); }); })];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
var generateName = function () {
    var now = new Date();
    var num = parseInt((now.getFullYear() - 2000).toString().padStart(2, "0")
        + now.getMonth().toString().padStart(2, "0")
        + now.getDate().toString().padStart(2, "0")
        + now.getHours().toString().padStart(2, "0")
        + now.getMinutes().toString().padStart(2, "0"));
    return '4chan-'
        + (9911312359 - num).toString(36) // Get the time until next century, in base 36
        + '-' + uuid_1.v4().slice(0, 8)
        + '.mp4';
};
function makeVid(rawSet, enabled, images) {
    return __awaiter(this, void 0, void 0, function () {
        var settings, _a, _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _a = {};
                    if (!rawSet.intro) return [3 /*break*/, 2];
                    return [4 /*yield*/, getFile(rawSet.intro)];
                case 1:
                    _b = _f.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _b = undefined;
                    _f.label = 3;
                case 3:
                    _a.intro = _b;
                    if (!rawSet.transition) return [3 /*break*/, 5];
                    return [4 /*yield*/, getFile(rawSet.transition)];
                case 4:
                    _c = _f.sent();
                    return [3 /*break*/, 6];
                case 5:
                    _c = undefined;
                    _f.label = 6;
                case 6:
                    _a.transition = _c;
                    if (!rawSet.outro) return [3 /*break*/, 8];
                    return [4 /*yield*/, getFile(rawSet.outro)];
                case 7:
                    _d = _f.sent();
                    return [3 /*break*/, 9];
                case 8:
                    _d = undefined;
                    _f.label = 9;
                case 9:
                    _a.outro = _d;
                    if (!rawSet.song) return [3 /*break*/, 11];
                    return [4 /*yield*/, getFile(rawSet.song)];
                case 10:
                    _e = _f.sent();
                    return [3 /*break*/, 12];
                case 11:
                    _e = undefined;
                    _f.label = 12;
                case 12:
                    settings = (_a.song = _e,
                        _a.voice = rawSet.voice,
                        _a);
                    return [4 /*yield*/, video_1.makeVids(enabled, images.map(function (i) { return i.image; }), settings)
                            .then(function (vid) {
                            console.log("vid rendered at ", vid);
                            var now = new Date();
                            var expires = new Date();
                            expires.setMonth(now.getMonth() + 1);
                            var name = generateName();
                            return new Promise(function (res, rej) {
                                s3.upload({
                                    Bucket: Bucket,
                                    Body: fs_1.createReadStream(vid),
                                    Key: name,
                                    Expires: expires,
                                }, function (err, data) { return err ? rej(err) : res(data); });
                            });
                        })];
                case 13: return [2 /*return*/, _f.sent()];
            }
        });
    });
}
var parseFiles = function (info, files) {
    // Special case when only one file is sent
    if (files.files.path) {
        return [{ id: 0, image: files.files.path }];
    }
    return info.map(function (a) {
        var file = files.files[a.id];
        if (file) {
            return { image: file.path, id: parseInt(a.id) };
        }
        else {
            throw new Error("Image wasn't found");
        }
    });
};
router
    .post('/vision', koaBody, function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, files, body, info, images, res;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = ctx.request, files = _a.files, body = _a.body;
                info = JSON.parse(body.info);
                images = parseFiles(info, files);
                return [4 /*yield*/, vision_1.readImages(images)];
            case 1:
                res = _b.sent();
                ctx.body = res;
                return [2 /*return*/];
        }
    });
}); })
    .post('/make-vid', koaBody, function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, files, body, images, enabled, rawSet;
    return __generator(this, function (_b) {
        _a = ctx.request, files = _a.files, body = _a.body;
        images = parseFiles(JSON.parse(body.info), files);
        enabled = JSON.parse(body.enabled);
        rawSet = JSON.parse(body.settings);
        makeVid(rawSet, enabled, images);
        ctx.body = {
            success: true,
        };
        return [2 /*return*/];
    });
}); })
    .post('/upload-file', koaBody, function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var files, _a, path, name, err_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                files = ctx.request.files;
                _a = files.file, path = _a.path, name = _a.name;
                _b.label = 1;
            case 1:
                _b.trys.push([1, 3, , 4]);
                return [4 /*yield*/, new Promise(function (res, rej) {
                        return s3.upload({
                            Bucket: FilesBucket,
                            Body: fs_1.createReadStream(path),
                            Key: name,
                        }, function (err, data) { return err ? rej(err) : res(data); });
                    })];
            case 2:
                _b.sent();
                ctx.body = {
                    success: true,
                };
                return [3 /*break*/, 4];
            case 3:
                err_1 = _b.sent();
                ctx.status = 400;
                ctx.body = {
                    success: false
                };
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); })
    .get('/vids/:key', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var data;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, new Promise(function (res, rej) {
                    s3.getObject({
                        Bucket: Bucket,
                        Key: ctx.params.key,
                    }, function (err, data) {
                        err ? rej(err) : res(data);
                    });
                })
                // Write buffer to body
            ];
            case 1:
                data = _a.sent();
                // Write buffer to body
                ctx.body = data.Body;
                return [2 /*return*/];
        }
    });
}); })
    .get('/vids', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var data;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, new Promise(function (res, rej) {
                    s3.listObjects({
                        Bucket: Bucket,
                        MaxKeys: 10,
                    }, function (err, data) {
                        err ? rej(err) : res(data);
                    });
                })];
            case 1:
                data = _a.sent();
                ctx.body = {
                    data: data.Contents,
                };
                return [2 /*return*/];
        }
    });
}); })
    .get('/files', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var Contents, keys;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, new Promise(function (res, rej) {
                    s3.listObjects({
                        Bucket: FilesBucket,
                        MaxKeys: 100,
                    }, function (err, data) {
                        err ? rej(err) : res(data);
                    });
                })];
            case 1:
                Contents = (_a.sent()).Contents;
                keys = Contents.map(function (d) { return d.Key; });
                // Return all the songs and videos in the files folder
                ctx.body = {
                    videos: keys.filter(function (f) { return f.slice(-4) === ".mp4"; }),
                    songs: keys.filter(function (f) { return f.slice(-4) === ".mp3"; }),
                };
                return [2 /*return*/];
        }
    });
}); })
    .get('/themes', function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var Items, data, err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, new Promise(function (res, rej) {
                        dynamodb.scan({
                            TableName: dbThemeName,
                        }, function (err, data) { return err ? rej(err) : res(data); });
                    })];
            case 1:
                Items = (_a.sent()).Items;
                data = Items.map(function (item) {
                    var _a, _b, _c, _d, _e;
                    return ({
                        themeId: item.themeId.S,
                        name: item.name.S,
                        intro: (_a = item.intro) === null || _a === void 0 ? void 0 : _a.S,
                        transition: (_b = item.transition) === null || _b === void 0 ? void 0 : _b.S,
                        outro: (_c = item.outro) === null || _c === void 0 ? void 0 : _c.S,
                        voice: (_d = item.voice) === null || _d === void 0 ? void 0 : _d.S,
                        song: (_e = item.song) === null || _e === void 0 ? void 0 : _e.S,
                    });
                });
                ctx.body = data;
                return [3 /*break*/, 3];
            case 2:
                err_2 = _a.sent();
                console.error(err_2);
                ctx.status = 404;
                ctx.body = {
                    success: false,
                };
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); })
    .post('/themes', bodyParser, function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, intro, transition, outro, song, voice, name, checker, Item;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _a = ctx.request.body, intro = _a.intro, transition = _a.transition, outro = _a.outro, song = _a.song, voice = _a.voice, name = _a.name;
                if (!name) {
                    ctx.status = 400;
                    ctx.body = {
                        success: false,
                        message: 'name is required',
                    };
                    return [2 /*return*/];
                }
                checker = function (s) { return s && s.length ? { S: s } : undefined; };
                Item = {
                    themeId: {
                        S: uuid_1.v4(),
                    },
                    name: {
                        S: name,
                    },
                    intro: checker(intro),
                    transition: checker(transition),
                    outro: checker(outro),
                    song: checker(song),
                    voice: checker(voice),
                };
                return [4 /*yield*/, new Promise(function (res, rej) { return dynamodb.putItem({
                        Item: Item,
                        TableName: dbThemeName,
                    }, function (err, data) { return err ? rej(err) : res(data); }); })];
            case 1:
                _b.sent();
                ctx.body = {
                    success: true,
                };
                return [2 /*return*/];
        }
    });
}); })
    .delete('/themes/:themeId', bodyParser, function (ctx) { return __awaiter(void 0, void 0, void 0, function () {
    var error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, new Promise(function (res, rej) {
                        return dynamodb.deleteItem({
                            Key: { themeId: { S: ctx.params.themeId } },
                            TableName: dbThemeName,
                        }, function (err, data) { return err ? rej(err) : res(data); });
                    })];
            case 1:
                _a.sent();
                ctx.body = { success: true };
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error(error_1);
                ctx.status = 404;
                ctx.body = { success: false };
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.use(router.routes());
app.listen(7000, function () { return console.log("Listening on port 7000"); });
