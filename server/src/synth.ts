// This file is for the tts calls

import * as fs from "fs"
import * as latinize from "latinize"
import fetch from "node-fetch"
import { file } from "tmp-promise"
import { stringFormatter } from "./string-formatter"

function cleanText(text: string): string {
    return text.replace(/\*/g, " ")
}

export function synthSpeech({
    text,
    voice,
}: {
    text: string[]
    voice: string
}): Promise<{ path: string; segments: string[] }> {
    text = text.map((t) => latinize(t))
    text = text.map(cleanText)

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

const insertBreaks = (string: string) =>
    string
        .replace(/(\.)\B/gi, "$1$1") // Dot turn into 2 dots, because daniel reads that as a full stop
        .replace(/\n/gi, "..$1") // newline turns into ..\n

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

const wrapStringsInSSML = (strings: string[]) => `
    <speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis" xml:lang="en-GB">
        <voice name="ScanSoft Daniel_Full_22kHz">
            <prosody volume="80">
                ${insertBookmarks(strings)}
            </prosody>
        </voice>
    </speak>
`

// Takes an array of strings and returns a file
export async function synthDaniel(
    strings: string[]
): Promise<{ path: string; segments: string[] }> {
    let f = await file({ postfix: ".wav" })

    let xmlEscapedAndDashed = stringFormatter(
        strings.map(insertBreaks)
    ).map((s) => encodeXML(s))

    // Add breaks before & after double quotes
    let xmlWithBreaks: string[] = []

    xmlEscapedAndDashed.forEach((string, i) => {
        let weakBreak = `<break strength="x-weak" />`
        xmlWithBreaks.push(
            string
                .replace(/\b&quot;(\s|$)/g, weakBreak + "$&")
                .replace(/(\s)&quot;\b/g, "$&" + weakBreak)
        )
        if (string.startsWith("&quot;") && i > 0) {
            // if first character is quote... push a break onto the ending of the previous reading
            xmlWithBreaks[i - 1] += weakBreak
        }
    })

    let data

    let tries = 0
    while (true) {
        try {
            data = await fetch("http://tts.redditvideomaker.com/synthesize", {
                method: "POST",
                body: JSON.stringify({
                    string: wrapStringsInSSML(xmlWithBreaks),
                }),
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 10000, // 10 second timeout
            }).then((r) => r.json())

            break
        } catch (error) {
            tries++
            if (tries > 5) throw new Error("Daniel failed a lot")
            console.error("Daniel failed for some reason")
            console.error(error)
            await new Promise((r) => setTimeout(r, 500)) // wait 500ms before retrying
        }
    }

    let {
        bookmarks,
        base64audio,
    }: { bookmarks: string; base64audio: string } = data

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
