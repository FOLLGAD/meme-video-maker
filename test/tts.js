const d = require("node-fetch")
const f = require("fs/promises")

const sentence = `how am i a retard and why i'm not having kids`
    .split(" ")
    .map((w) => `${w} <break time="50ms" />`)
    .join(" ")
// .replace(/ /g, `<break strength="x-weak" />`)

d("http://tts.redditvideomaker.com/synthesize", {
    method: "POST",
    body: JSON.stringify({
        string: `
            <speak version="1.0" xmlns="https://www.w3.org/2001/10/synthesis" xml:lang="en-GB">
                <voice name="ScanSoft Daniel_Full_22kHz">
                    ${sentence}
                </voice>
            </speak>
        `,
    }),
    headers: {
        "Content-Type": "application/json",
    },
})
    .then((d) => d.json())
    .then(async (d) => {
        await f.writeFile(
            "./out.wav",
            Buffer.from(
                d.base64audio.replace(
                    "data:audio/wav; codecs=opus;base64,",
                    ""
                ),
                "base64"
            )
        )
    })
