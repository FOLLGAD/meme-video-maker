"use strict";
// This file is for the tts calls
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthOddcast = exports.synthGoogle = exports.macTTSToFile = exports.linuxTTSToFile = exports.synthSpeech = void 0;
var fs = require("fs");
var daniel_1 = require("./daniel");
var child_process_1 = require("child_process");
var tmp = require("tmp");
var textToSpeech = require("@google-cloud/text-to-speech");
var client = new textToSpeech.TextToSpeechClient({});
var defaultVoiceSettings = {
    speakingRate: 0.98,
    "languageCode": "en-US",
    "voiceName": "en-US-Wavenet-D",
    pitch: -2.0,
};
function synthSpeech(_a) {
    var text = _a.text, voice = _a.voice;
    if (!/[\d\w]/.test(text)) { // If no letter or number is in text, don't produce it
        return new Promise(function (_, rej) { return rej("Warning: TTS for current frame is empty"); });
    }
    switch (voice) {
        case "daniel":
            if (process.platform === "darwin") {
                // Darwin means Mac
                return module.exports.macTTSToFile(text);
            }
            // Else, fall back on the epic Oddcast api
            return module.exports.synthOddcast(text);
        case "linux":
            // Don't use
            return module.exports.linuxTTSToFile(text);
        case "google-uk":
            return module.exports.synthGoogle(text, {
                languageCode: "en-GB",
                voiceName: "en-GB-Wavenet-B",
                pitch: -4.4,
                speakingRate: 0.96,
            });
        case "google-us":
        default:
            // Fallthrough to default
            return module.exports.synthGoogle(text, {
                speakingRate: 0.98,
                languageCode: "en-US",
                voiceName: "en-US-Wavenet-D",
                pitch: -2.0,
            });
    }
}
exports.synthSpeech = synthSpeech;
function linuxTTSToFile(text) {
    return new Promise(function (resolve) {
        var file = tmp.fileSync({ postfix: '.mp3' });
        var filepath = file.name;
        var proc = child_process_1.spawn('espeak', ['-w', filepath, text]);
        proc.on('exit', function () {
            resolve(filepath);
        });
    });
}
exports.linuxTTSToFile = linuxTTSToFile;
function macTTSToFile(text) {
    return new Promise(function (resolve) {
        var file = tmp.fileSync({ postfix: '.aiff' });
        var filepath = file.name;
        var proc = child_process_1.spawn('say', ['-o', filepath, '-v', 'Daniel', text]);
        proc.on('exit', function () {
            resolve(filepath);
        });
    });
}
exports.macTTSToFile = macTTSToFile;
function synthGoogle(text, voiceSettings) {
    if (voiceSettings === void 0) { voiceSettings = defaultVoiceSettings; }
    text = text
        .replace(/[><]/g, "") // Remove greater/less than
        .split("\n")
        .map(function (line) { return line.trim(); })
        .map(function (line) { return line + "."; })
        .join("\n");
    var request = {
        input: { text: text },
        voice: { languageCode: voiceSettings.languageCode, ssmlGender: "MALE", name: voiceSettings.voiceName },
        audioConfig: { audioEncoding: 'MP3', speakingRate: voiceSettings.speakingRate, pitch: voiceSettings.pitch },
    };
    return new Promise(function (res, rej) {
        var file = tmp.fileSync({ postfix: '.mp3' });
        var filepath = file.name;
        client.synthesizeSpeech(request, function (err, response) {
            if (err || !response || !response.audioContent) {
                return rej(err);
            }
            if (typeof response.audioContent === "string") {
                return rej();
            }
            // Write the binary audio content to a local file
            fs.writeFile(filepath, response.audioContent, 'binary', function (err) { return err ? rej(err) : res(filepath); });
        });
    });
}
exports.synthGoogle = synthGoogle;
function synthOddcast(text) {
    return new Promise(function (resolve, reject) {
        daniel_1.makeCall(text)
            .then(function (res) { return res.buffer(); })
            .then(function (buffer) {
            var file = tmp.fileSync({ postfix: '.mp3' });
            var filepath = file.name;
            fs.writeFileSync(filepath, buffer);
            resolve(filepath);
        })
            .catch(function () {
            reject();
        });
    });
}
exports.synthOddcast = synthOddcast;
