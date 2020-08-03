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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeVids = exports.filesPath = void 0;
// TODO: Could also use gm for image manipulation: https://github.com/aheckmann/gm
var Canvas = require("canvas");
var ffmpeg = require("fluent-ffmpeg");
var path_1 = require("path");
var tmp_promise_1 = require("tmp-promise");
var synth_1 = require("./synth");
// Ffprobe
// Usually takes ~40ms
var probe = function (path) {
    return new Promise(function (res, rej) {
        ffmpeg.ffprobe(path, function (err, data) {
            if (err)
                rej(err);
            else
                res(data);
        });
    });
};
exports.filesPath = path_1.join(__dirname, "../files");
function intersperse(d, sep) {
    return d.reduce(function (acc, val, i) { return i === 0 ? __spreadArrays(acc, [val]) : __spreadArrays(acc, [sep, val]); }, []);
}
function parallell(imageReaders, images, settings) {
    return __awaiter(this, void 0, void 0, function () {
        var promises;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    promises = imageReaders.map(function (_, i) {
                        return makeImageThing(imageReaders[i], images[i], settings);
                    });
                    return [4 /*yield*/, Promise.all(promises)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function serial(imageReaders, images, settings) {
    return __awaiter(this, void 0, void 0, function () {
        var arr, i, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    arr = [];
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < imageReaders.length)) return [3 /*break*/, 4];
                    return [4 /*yield*/, makeImageThing(imageReaders[i], images[i], settings)];
                case 2:
                    result = _a.sent();
                    arr.push(result);
                    _a.label = 3;
                case 3:
                    i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, arr];
            }
        });
    });
}
function makeVids(imageReaders, images, settings) {
    return __awaiter(this, void 0, void 0, function () {
        var vids, out, songout;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, serial(imageReaders, images, settings)];
                case 1:
                    vids = _a.sent();
                    if (settings.transition)
                        vids = intersperse(vids, settings.transition);
                    if (settings.intro)
                        vids.unshift(settings.intro);
                    if (settings.outro)
                        vids.push(settings.outro);
                    return [4 /*yield*/, tmp_promise_1.file({ postfix: '.mp4' })];
                case 2:
                    out = _a.sent();
                    return [4 /*yield*/, simpleConcat(vids.filter(function (v) { return v; }), out.path)];
                case 3:
                    _a.sent();
                    if (!settings.song) return [3 /*break*/, 6];
                    return [4 /*yield*/, tmp_promise_1.file({ postfix: '.mp4' })];
                case 4:
                    songout = _a.sent();
                    return [4 /*yield*/, combineVideoAudio(out.path, settings.song, songout.path)];
                case 5:
                    _a.sent();
                    return [2 /*return*/, songout.path];
                case 6: return [2 /*return*/, out.path];
            }
        });
    });
}
exports.makeVids = makeVids;
function makeImageThing(imageReader, image, settings) {
    return __awaiter(this, void 0, void 0, function () {
        var blockingColor, loadedImage, width, height, imageCanvas, imageCanvCtx, blockingCanvas, ctx, vids, _loop_1, i, out;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (imageReader.blocks.length === 0) {
                        return [2 /*return*/, null];
                    }
                    blockingColor = "#000000";
                    return [4 /*yield*/, Canvas.loadImage(image)];
                case 1:
                    loadedImage = _a.sent();
                    width = loadedImage.width, height = loadedImage.height;
                    return [4 /*yield*/, Canvas.createCanvas(width, height)];
                case 2:
                    imageCanvas = _a.sent();
                    imageCanvCtx = imageCanvas.getContext('2d');
                    return [4 /*yield*/, Canvas.createCanvas(width, height)
                        // ...and fill it black
                    ];
                case 3:
                    blockingCanvas = _a.sent();
                    ctx = blockingCanvas.getContext("2d");
                    ctx.fillStyle = blockingColor;
                    ctx.fillRect(0, 0, width, height);
                    // Always show the alwaysShows area of the screen
                    imageReader.alwaysShow && imageReader.alwaysShow.forEach(function (d) {
                        ctx.clearRect(d.x, d.y, d.width, d.height);
                    });
                    vids = [];
                    _loop_1 = function (i) {
                        var readRect, speechFile, f;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    readRect = imageReader.blocks[i];
                                    // Clear text
                                    ctx.clearRect(0, 0, width, readRect.block.y + readRect.block.height);
                                    return [4 /*yield*/, synth_1.synthSpeech({ text: readRect.text, voice: settings.voice || "daniel" })];
                                case 1:
                                    speechFile = _a.sent();
                                    return [4 /*yield*/, new Promise(function (res, rej) { return __awaiter(_this, void 0, void 0, function () {
                                            var f;
                                            return __generator(this, function (_a) {
                                                switch (_a.label) {
                                                    case 0: return [4 /*yield*/, tmp_promise_1.file({ postfix: '.mp4' })];
                                                    case 1:
                                                        f = _a.sent();
                                                        imageCanvCtx.clearRect(0, 0, width, height);
                                                        // Draw source
                                                        imageCanvCtx.drawImage(loadedImage, 0, 0, width, height);
                                                        if (i < imageReader.blocks.length - 1) {
                                                            // Draw blockage
                                                            imageCanvCtx.drawImage(blockingCanvas, 0, 0, width, height);
                                                        }
                                                        ffmpeg()
                                                            .input(imageCanvas.createPNGStream())
                                                            .input(image)
                                                            .input(speechFile)
                                                            .size('1920x1080')
                                                            .aspect('16:9')
                                                            .autopad()
                                                            .audioCodec('aac')
                                                            .outputOptions([
                                                            "-pix_fmt yuv420p",
                                                        ])
                                                            .audioFrequency(24000)
                                                            .audioChannels(2)
                                                            .fps(25)
                                                            .videoCodec('libx264')
                                                            .save(f.path)
                                                            .on('error', rej)
                                                            .on('end', function () { return res(f); });
                                                        return [2 /*return*/];
                                                }
                                            });
                                        }); })];
                                case 2:
                                    f = _a.sent();
                                    vids.push(f.path);
                                    return [2 /*return*/];
                            }
                        });
                    };
                    i = 0;
                    _a.label = 4;
                case 4:
                    if (!(i < imageReader.blocks.length)) return [3 /*break*/, 7];
                    return [5 /*yield**/, _loop_1(i)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    i++;
                    return [3 /*break*/, 4];
                case 7: return [4 /*yield*/, tmp_promise_1.file({ postfix: '.mp4' })];
                case 8:
                    out = _a.sent();
                    return [4 /*yield*/, simpleConcat(vids, out.path)];
                case 9:
                    _a.sent();
                    return [2 /*return*/, out.path];
            }
        });
    });
}
function simpleConcat(videoPaths, outPath) {
    var _this = this;
    return new Promise(function (res, rej) { return __awaiter(_this, void 0, void 0, function () {
        var tempdir, f;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, tmp_promise_1.dir()];
                case 1:
                    tempdir = _a.sent();
                    f = ffmpeg();
                    videoPaths.forEach(function (v) {
                        f.input(v);
                    });
                    f
                        .on('end', function () {
                        res();
                        tempdir.cleanup();
                    })
                        .on('error', function (err) {
                        console.error(err);
                        rej(err);
                    })
                        // @ts-ignore
                        .mergeToFile(outPath, tempdir.path);
                    return [2 /*return*/];
            }
        });
    }); });
}
// TODO: scroll long images with video
/*
    Overlays audio over a video clip, repeating it ad inifinitum.
*/
function combineVideoAudio(videoPath, audioPath, outPath) {
    var _this = this;
    return new Promise(function (res, rej) { return __awaiter(_this, void 0, void 0, function () {
        var videoInfo;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, probe(videoPath)];
                case 1:
                    videoInfo = _a.sent();
                    ffmpeg(videoPath)
                        .videoCodec('libx264')
                        .input(audioPath)
                        .audioCodec('aac')
                        .inputOptions([
                        '-stream_loop -1',
                    ])
                        .duration(videoInfo.format.duration) // Run for the duration of the video
                        .complexFilter(['[0:a][1:a] amerge=inputs=2 [a]'])
                        .fpsOutput(25)
                        .outputOptions([
                        '-map 0:v',
                        '-map [a]',
                    ])
                        .audioChannels(1)
                        .on('end', function () {
                        res();
                    })
                        .on('error', function (err) {
                        console.error(err);
                        rej();
                    })
                        .save(outPath);
                    return [2 /*return*/];
            }
        });
    }); });
}
