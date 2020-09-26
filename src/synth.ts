// This file is for the tts calls

import * as fs from "fs"
import { file } from "tmp-promise"
import * as latinize from "latinize"

import * as textToSpeech from "@google-cloud/text-to-speech"
import fetch from "node-fetch"

export function synthSpeech({
    text,
    voice,
}: {
    text: string[]
    voice: string
}): Promise<{ path: string; segments: string[] }> {
    text = text.map((t) => latinize(t))

    if (text.length === 0 || (text.length === 1 && text[0].length === 0)) {
        // If no letter or number is in text, don't produce it
        return Promise.reject("Warning: TTS for current frame is empty")
    }
    return synthDaniel(text)

    // switch (voice) {
    //     case "daniel":

    // case "google-uk":
    //     return synthGoogle(text, {
    //         languageCode: "en-GB",
    //         voiceName: "en-GB-Wavenet-B",
    //         pitch: -4.4,
    //         speakingRate: 0.96,
    //     })

    // case "google-us":
    // default:
    //     // Fallthrough to default
    //     return synthGoogle(text, {
    //         speakingRate: 0.98,
    //         languageCode: "en-US",
    //         voiceName: "en-US-Wavenet-D",
    //         pitch: -2.0,
    //     })
    // }
}

// const client = new textToSpeech.TextToSpeechClient({})

// const defaultVoiceSettings = {
//     speakingRate: 0.98,
//     languageCode: "en-US",
//     voiceName: "en-US-Wavenet-D",
//     pitch: -2.0,
// }

// export function synthGoogle(
//     text,
//     voiceSettings = defaultVoiceSettings
// ): Promise<string> {
//     text = text
//         .replace(/[><]/g, "") // Remove greater/less than
//         .split("\n")
//         .map((line) => line.trim())
//         .map((line) => line + ".")
//         .join("\n")

//     const request: textToSpeech.protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
//         input: { text: text },
//         voice: {
//             languageCode: voiceSettings.languageCode,
//             ssmlGender: "MALE",
//             name: voiceSettings.voiceName,
//         },
//         audioConfig: {
//             audioEncoding: "MP3",
//             speakingRate: voiceSettings.speakingRate,
//             pitch: voiceSettings.pitch,
//         },
//     }

//     return new Promise((res, rej) => {
//         let file = tmp.fileSync({ postfix: ".mp3" })
//         let filepath = file.name

//         client.synthesizeSpeech(request, (err, response) => {
//             if (err || !response || !response.audioContent) {
//                 return rej(err)
//             }
//             if (typeof response.audioContent === "string") {
//                 return rej()
//             }

//             // Write the binary audio content to a local file
//             fs.writeFile(filepath, response.audioContent, "binary", (err) =>
//                 err ? rej(err) : res(filepath)
//             )
//         })
//     })
// }

// https://stackoverflow.com/a/7918944
function encodeXML(string) {
    return string
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;")
}

function insertBookmarks(array: string[]) {
    const a: string[] = []
    for (let i = 0; i < array.length; i++) {
        a.push(array[i], `<mark name="${i}" />`)
    }
    return a.join(" ")
}

const stringsToSSML = (strings: string[]) => `
    <speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis" xml:lang="en-GB">
        <voice name="ScanSoft Daniel_Full_22kHz">
            ${insertBookmarks(strings)}
        </voice>
    </speak>
`

synthDaniel([
    "hello, my name &lt; is daniel &gt; haha.",
    "testing &amp; &amp; &amp; &amp; which is and",
]).then(console.log)

// Takes an array of strings and returns a file
export async function synthDaniel(
    strings: string[]
): Promise<{ path: string; segments: string[] }> {
    let f = await file({ postfix: ".mp3" })

    const xmlEscaped = strings.map((s) => encodeXML(s))

    let {
        bookmarks,
        base64audio,
    }: { bookmarks: string; base64audio: string } = await fetch(
        "http://tts.redditvideomaker.com/synthesize",
        {
            method: "POST",
            body: JSON.stringify({
                string: stringsToSSML(xmlEscaped),
            }),
            headers: {
                "Content-Type": "application/json",
            },
        }
    ).then((r) => r.json())

    // Save audio as binary
    fs.writeFileSync(
        f.path,
        Buffer.from(
            base64audio.replace("data:audio/wav; codecs=opus;base64,", ""),
            "base64"
        )
    )

    let segments = bookmarks
        .split("\r\n")
        .slice(0, -1)
        .map((b) => b.split("\t")[1])

    return { path: f.path, segments }
}
