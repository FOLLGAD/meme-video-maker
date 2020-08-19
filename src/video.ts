// TODO: Could also use gm for image manipulation: https://github.com/aheckmann/gm
import * as Canvas from "canvas"
import * as ffmpeg from "fluent-ffmpeg"
import { writeFileSync, createWriteStream } from "fs"
import { join } from "path"
import { file, fileSync, FileResult } from "tmp-promise"
import { synthSpeech } from "./synth"

const blockColor = "black"

export interface Rec {
    x: number
    y: number
    height: number
    width: number
}

export interface ReadStage {
    type: "read"
    rect: Rec
    text: string
    reveal: boolean
    blockuntil: boolean
}
export interface PauseStage {
    type: "pause"
    secs: number
}
export interface RevealStage {
    type: "reveal"
    rect: Rec
}
export interface GifStage {
    type: "gif"
    times: number
}

export type Stage = ReadStage | PauseStage | RevealStage | GifStage

export type Pipeline = Stage[]

// Ffprobe
// Usually takes ~40ms
const probe = function (path) {
    return new Promise((res, rej) => {
        ffmpeg.ffprobe(path, (err, data) => {
            if (err) rej(err)
            else res(data)
        })
    })
}

interface Settings {
    transition?: string
    intro?: string
    outro?: string
    song?: string
    voice?: string
}

export const filesPath = join(__dirname, "../files")

function intersperse(d: any[], sep: any): any[] {
    return d.reduce(
        (acc, val, i) => (i === 0 ? [...acc, val] : [...acc, sep, val]),
        []
    )
}

async function parallell(
    imageReaders: Pipeline[],
    images: string[],
    settings: Settings
) {
    const promises = imageReaders.map((_, i) => {
        return makeImageThing(imageReaders[i], images[i], settings)
    })
    return await Promise.all(promises)
}

async function serial(
    imageReaders: Pipeline[],
    images: string[],
    settings: Settings
) {
    let arr: (string | null)[] = []
    for (let i = 0; i < imageReaders.length; i++) {
        console.log("Index:", i)
        const result = await makeImageThing(
            imageReaders[i],
            images[i],
            settings
        )
        arr.push(result)
    }
    return arr
}

function notEmpty<TValue>(value: TValue | null): value is TValue {
    return value !== null
}

export async function makeVids(
    pipeline: Pipeline[],
    images: string[],
    settings: Settings
): Promise<string> {
    console.log("Making clips...")
    let vidsMidOrNull = await serial(pipeline, images, settings)
    let vidsMid = vidsMidOrNull.filter(notEmpty)

    if (settings.transition) vidsMid = intersperse(vidsMid, settings.transition)

    let out = await file({ postfix: ".mp4" })

    console.log("Concatting w/ transitions")
    await simpleConcat(vidsMid, out.path)

    if (settings.song) {
        const songout = await file({ postfix: ".mp4" })

        console.log("Adding song")

        await combineVideoAudio(out.path, settings.song!, songout.path)

        out.cleanup()
        out = songout
    }

    let vidsFull = [out.path]

    if (settings.intro) vidsFull.unshift(settings.intro)
    if (settings.outro) vidsFull.push(settings.outro)

    let vidPath = out
    if (vidsFull.length > 1) {
        // If has outro or intro
        vidPath = await file({ postfix: ".mp4" })
        console.log("Adding intro, outro")
        await simpleConcat(vidsFull, vidPath.path)
        out.cleanup()
    }

    return vidPath.path
}

async function makeImageThing(
    pipeline: Pipeline,
    image: string,
    settings: Settings
): Promise<string | null> {
    if (pipeline.length === 0) {
        return null
    }

    const loadedImage = await Canvas.loadImage(image)
    const { width, height } = loadedImage
    const imageCanvas = await Canvas.createCanvas(width, height)
    const imageCanvCtx = imageCanvas.getContext("2d")

    // Create the canvas that will cover the image
    const blockingCanvas = await Canvas.createCanvas(width, height)
    // ...and fill it black
    const ctx = blockingCanvas.getContext("2d")
    ctx.fillStyle = blockColor
    ctx.fillRect(0, 0, width, height)

    let vids: string[] = []

    const createFfmpeg = (opts = {}) =>
        ffmpeg(opts)
            .audioCodec("aac")
            .outputOptions(["-pix_fmt yuv420p"])
            .audioFrequency(24000)
            .audioChannels(2)
            .size("1920x1080")
            .autopad()
            .fps(25)
            .videoCodec("libx264")

    for (let i = 0; i < pipeline.length; i++) {
        const stage = pipeline[i]

        if (stage.type === "read") {
            if (stage.reveal) {
                // Clear text
                ctx.clearRect(0, 0, width, stage.rect.y + stage.rect.height)
            } else {
                ctx.clearRect(
                    stage.rect.x,
                    stage.rect.y,
                    stage.rect.width,
                    stage.rect.height
                )
            }

            try {
                const speechFile = await synthSpeech({
                    text: stage.text,
                    voice: settings.voice || "daniel",
                })

                const f: FileResult = await new Promise(async (res, rej) => {
                    const f = await file({ postfix: ".mp4" })

                    imageCanvCtx.clearRect(0, 0, width, height)
                    // Draw source
                    imageCanvCtx.drawImage(loadedImage, 0, 0, width, height)
                    if (i < pipeline.length - 1) {
                        // Draw blockage
                        imageCanvCtx.drawImage(
                            blockingCanvas,
                            0,
                            0,
                            width,
                            height
                        )
                    }

                    // For every "blockuntil" read block that comes after the current stage,
                    // block it!
                    imageCanvCtx.fillStyle = blockColor
                    pipeline
                        .slice(i + 1)
                        .filter(
                            (s): s is ReadStage =>
                                s.type === "read" && s.blockuntil
                        )
                        .forEach(({ rect }) => {
                            imageCanvCtx.fillRect(
                                rect.x,
                                rect.y,
                                rect.width,
                                rect.height
                            )
                        })

                    createFfmpeg()
                        .input(imageCanvas.createPNGStream())
                        .input(speechFile)
                        // .complexFilter(
                        //     [
                        //         // Overlay the imageCanvas ontop of the image
                        //         "[0:v][1:v]overlay=0:0[overlaid]",
                        //         // {
                        //         //     // inputs: ["padded", "1"],
                        //         //     filter: "overlay",
                        //         //     options: { x: 0, y: 0 },
                        //         //     outputs: "overlaid",
                        //         // },
                        //         {
                        //             inputs: "overlaid",
                        //             filter: "scale",
                        //             options: {
                        //                 w: 1920,
                        //                 h: 1080,
                        //                 force_original_aspect_ratio: 1,
                        //             },
                        //             outputs: "scaled",
                        //         },
                        //         {
                        //             inputs: "scaled",
                        //             filter: "pad",
                        //             options: [
                        //                 1280,
                        //                 720,
                        //                 "(ow-iw)/2",
                        //                 "(oh-ih)/2",
                        //             ],
                        //             outputs: "padded",
                        //         },
                        //     ],
                        //     "padded"
                        // )
                        .save(f.path)
                        .on("error", (err) =>
                            rej(
                                new Error(
                                    err || "Something with ffmpeg went wrong"
                                )
                            )
                        )
                        .on("end", () => res(f))
                })

                vids.push(f.path)
            } catch (err) {
                console.error("MakeImageThing:", err)
                // scene couldn't be rendered, so it won't be pushed to the video-list
            }
        } else if (stage.type === "pause") {
            const pauseTime = Math.min(Math.abs(stage.secs), 10)
            console.log("pausing for", pauseTime, "seconds")
            try {
                const f: FileResult = await new Promise(async (res, rej) => {
                    const f = await file({ postfix: ".mp4" })

                    imageCanvCtx.clearRect(0, 0, width, height)
                    // Draw source
                    imageCanvCtx.drawImage(loadedImage, 0, 0, width, height)
                    if (i < pipeline.length - 1) {
                        // Draw blockage
                        imageCanvCtx.drawImage(
                            blockingCanvas,
                            0,
                            0,
                            width,
                            height
                        )
                    }
                    let bruhh = await file({ postfix: ".png" })
                    let stream = createWriteStream(bruhh.path)
                    imageCanvas.createPNGStream().pipe(stream)

                    await new Promise((r) => stream.on("finish", r))

                    ffmpeg(bruhh.path)
                        .inputOptions(["-loop 1"])
                        .size("1920x1080")
                        .autopad()
                        .fps(25)
                        .videoCodec("libx264")
                        .outputOptions([`-t ${pauseTime}`, "-pix_fmt yuv420p"])
                        .save(f.path)
                        .on("error", (err) =>
                            rej(
                                new Error(
                                    err || "Something with ffmpeg went wrong"
                                )
                            )
                        )
                        .on("end", () => res(f))
                })

                vids.push(f.path)
            } catch (error) {
                console.error("Pause failed:", error)
            }
        } else if (stage.type === "reveal") {
            ctx.clearRect(
                stage.rect.x,
                stage.rect.y,
                stage.rect.width,
                stage.rect.height
            )
        } else if (stage.type === "gif") {
            const times = Math.min(Math.abs(stage.times), 40)
            let f = await file({ postfix: ".mp4" })

            ffmpeg(image)
                .loop(times)
                .size("1920x1080")
                .autopad()
                .fps(25)
                .videoCodec("libx264")
                .outputOptions(["-pix_fmt yuv420p"])
                .save(f.path)
            // play the gif somehow
            console.error("GIF: Unimplemented")
        }
    }

    if (vids.length === 0) {
        return null
    }

    const out = await file({ postfix: ".mp4" })
    await simpleConcat(vids, out.path)

    return out.path
}

function getConcat(videoPaths) {
    let txt = fileSync()
    let tempPath = txt.name

    writeFileSync(tempPath, videoPaths.map((d) => `file '${d}'\n`).join(""))

    let f = ffmpeg().input(tempPath).inputOptions(["-f concat", "-safe 0"])
    return f
}

function simpleConcat(videoPaths: string[], outPath) {
    return new Promise((res, rej) => {
        getConcat(videoPaths)
            .videoCodec("copy")
            .audioCodec("copy")
            .on("end", () => {
                res()
            })
            .on("error", (err) => {
                console.error(err)
                rej()
            })
            .save(outPath)
    })
}

// TODO: scroll long images with video

/* 
    Overlays audio over a video clip, repeating it ad inifinitum.
*/
function combineVideoAudio(videoPath, audioPath, outPath) {
    return new Promise(async (res, rej) => {
        let videoInfo: any = await probe(videoPath)

        ffmpeg(videoPath)
            .videoCodec("copy")
            .input(audioPath)
            .inputOptions([
                "-stream_loop -1", // Repeats audio until it hits the previously set duration [https://stackoverflow.com/a/34280687/6912118]
            ])
            .audioCodec("aac")
            .duration(videoInfo.format.duration) // Run for the duration of the video
            .complexFilter(["[0:a:0][1:a:0] amerge=inputs=2 [aout]"])
            .outputOptions(["-map 0:v:0", "-map [aout]"])
            .audioChannels(1)
            .on("end", () => {
                res()
            })
            .on("error", (err) => {
                console.error(err)
                rej()
            })
            .save(outPath)
    })
}

export function normalizeVideo(videoPath: string, outPath: string) {
    return new Promise((res, rej) =>
        ffmpeg(videoPath)
            .audioCodec("aac")
            .outputOptions(["-pix_fmt yuv420p"])
            .audioFrequency(24000)
            .audioChannels(2)
            .fps(25)
            .videoCodec("libx264")
            .save(outPath)
            .on("end", res)
            .on("error", rej)
    )
}
