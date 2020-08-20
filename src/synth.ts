// This file is for the tts calls

import fs = require("fs")
import { makeCall } from "./daniel"
import { spawn } from "child_process"
import tmp = require("tmp")

import textToSpeech = require("@google-cloud/text-to-speech")
const client = new textToSpeech.TextToSpeechClient({})

const defaultVoiceSettings = {
    speakingRate: 0.98,
    languageCode: "en-US",
    voiceName: "en-US-Wavenet-D",
    pitch: -2.0,
}

export function synthSpeech({
    text,
    voice,
}: {
    text: string
    voice: string
}): Promise<string> {
    if (text.trim().length === 0) {
        // If no letter or number is in text, don't produce it
        return new Promise((_, rej) =>
            rej("Warning: TTS for current frame is empty")
        )
    }

    switch (voice) {
        case "daniel":
            if (process.platform === "darwin") {
                // Darwin means Mac
                return module.exports.macTTSToFile(text)
            }
            // Else, fall back on the epic Oddcast api
            return module.exports.synthOddcast(text)

        case "linux":
            // Don't use
            return module.exports.linuxTTSToFile(text)

        case "google-uk":
            return module.exports.synthGoogle(text, {
                languageCode: "en-GB",
                voiceName: "en-GB-Wavenet-B",
                pitch: -4.4,
                speakingRate: 0.96,
            })

        case "google-us":
        default:
            // Fallthrough to default
            return module.exports.synthGoogle(text, {
                speakingRate: 0.98,
                languageCode: "en-US",
                voiceName: "en-US-Wavenet-D",
                pitch: -2.0,
            })
    }
}

export function linuxTTSToFile(text) {
    return new Promise((resolve) => {
        let file = tmp.fileSync({ postfix: ".mp3" })
        let filepath = file.name

        let proc = spawn("espeak", ["-w", filepath, text])
        proc.on("exit", () => {
            resolve(filepath)
        })
    })
}

export function macTTSToFile(text) {
    return new Promise((resolve) => {
        let file = tmp.fileSync({ postfix: ".aiff" })
        let filepath = file.name

        let proc = spawn("say", ["-o", filepath, "-v", "Daniel", text])
        proc.on("exit", () => {
            resolve(filepath)
        })
    })
}

export function synthGoogle(text, voiceSettings = defaultVoiceSettings) {
    text = text
        .replace(/[><]/g, "") // Remove greater/less than
        .split("\n")
        .map((line) => line.trim())
        .map((line) => line + ".")
        .join("\n")

    const request: textToSpeech.protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { text: text },
        voice: {
            languageCode: voiceSettings.languageCode,
            ssmlGender: "MALE",
            name: voiceSettings.voiceName,
        },
        audioConfig: {
            audioEncoding: "MP3",
            speakingRate: voiceSettings.speakingRate,
            pitch: voiceSettings.pitch,
        },
    }

    return new Promise((res, rej) => {
        let file = tmp.fileSync({ postfix: ".mp3" })
        let filepath = file.name

        client.synthesizeSpeech(request, (err, response) => {
            if (err || !response || !response.audioContent) {
                return rej(err)
            }
            if (typeof response.audioContent === "string") {
                return rej()
            }

            // Write the binary audio content to a local file
            fs.writeFile(filepath, response.audioContent, "binary", (err) =>
                err ? rej(err) : res(filepath)
            )
        })
    })
}

export function synthOddcast(text): Promise<string> {
    return new Promise((resolve, reject) => {
        makeCall(text)
            .then((res: any): Buffer => res.buffer())
            .then((buffer) => {
                let file = tmp.fileSync({ postfix: ".mp3" })
                let filepath = file.name

                fs.writeFileSync(filepath, buffer)
                resolve(filepath)
            })
            .catch(() => {
                reject()
            })
    })
}
