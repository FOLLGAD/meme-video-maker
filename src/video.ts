// TODO: Could also use gm for image manipulation: https://github.com/aheckmann/gm
import * as Canvas from "canvas"
import * as ffmpeg from "fluent-ffmpeg"
import { writeFileSync, createWriteStream } from "fs"
import { join } from "path"
import { file, fileSync, FileResult, setGracefulCleanup } from "tmp-promise"
import { synthSpeech } from "./synth"

setGracefulCleanup()

const blockColor = "black"

export interface Rec {
    x: number
    y: number
    height: number
    width: number
}

export interface ReadStage {
    type: "read"
    rect: Rec[]
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
    outWidth?: number
    outHeight?: number
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

const ffprobe = (path): Promise<ffmpeg.FfprobeData> =>
    new Promise((res, rej) =>
        ffmpeg.ffprobe(path, (err, data) => (err ? rej(err) : res(data)))
    )

async function convToDims(
    vidPAth: string,
    w = 1920,
    h = 1080
): Promise<string> {
    const res = await ffprobe(vidPAth)
    const vidStream = res.streams.some(
        (stream) =>
            stream.width &&
            stream.height &&
            stream.width === w &&
            stream.height === h
    )
    if (vidStream) return vidPAth

    let f = await file({ postfix: ".mp4" })

    await new Promise((r, x) =>
        ffmpeg(vidPAth)
            .size(getResString(w, h))
            .autopad()
            .audioCodec("aac")
            .outputOptions(["-pix_fmt yuv420p"])
            .audioFrequency(24000)
            .audioChannels(2)
            .fps(25)
            .videoCodec("libx264")
            .save(f.path)
            .on("end", r)
            .on("error", x)
    )

    return f.path
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

    if (settings.intro)
        vidsFull.unshift(
            await convToDims(
                settings.intro,
                settings.outWidth,
                settings.outHeight
            )
        )
    if (settings.outro)
        vidsFull.push(
            await convToDims(
                settings.outro,
                settings.outWidth,
                settings.outHeight
            )
        )

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

    const outWidth = settings.outWidth || 1920
    const outHeight = settings.outHeight || 1080

    if (outWidth > 10000 || outHeight > 10000)
        throw new Error("Too large video dimensions bro")

    const loadedImage = await Canvas.loadImage(image)
    const { width, height } = loadedImage
    const imageCanvas = Canvas.createCanvas(width, height)
    const imageCanvCtx = imageCanvas.getContext("2d")

    // Create the canvas that will cover the image
    const blockingCanvas = Canvas.createCanvas(width, height)
    // ...and fill it black
    const blockingCtx = blockingCanvas.getContext("2d")
    blockingCtx.fillStyle = blockColor
    blockingCtx.fillRect(0, 0, width, height)

    let vids: string[] = []

    for (let i = 0; i < pipeline.length; i++) {
        const stage = pipeline[i]
        if (stage.type === "read") {
            if (stage.reveal) {
                // Clear text
                stage.rect.forEach((rect) =>
                    blockingCtx.clearRect(0, 0, width, rect.y + rect.height)
                )
            } else {
                // Reveal text-blocks still?
                // stage.rect.forEach((rect) =>
                //     blockingCtx.clearRect(
                //         rect.x,
                //         rect.y,
                //         rect.width,
                //         rect.height
                //     )
                // )
            }
        }

        imageCanvCtx.clearRect(0, 0, width, height)
        // Draw source
        imageCanvCtx.drawImage(loadedImage, 0, 0, width, height)
        // Do not draw if on last stage and stage isn't read
        if (i < pipeline.length - 1 || stage.type !== "read") {
            // Draw blockage
            imageCanvCtx.drawImage(blockingCanvas, 0, 0, width, height)
        }

        // For every "blockuntil" read block that comes after the current stage,
        // block it!
        imageCanvCtx.fillStyle = blockColor
        pipeline
            .slice(i + 1)
            .filter((s): s is ReadStage => s.type === "read" && s.blockuntil)
            .forEach(({ rect }) => {
                rect.forEach((r) =>
                    imageCanvCtx.fillRect(r.x, r.y, r.width, r.height)
                )
            })

        if (stage.type === "read") {
            try {
                const speechFile = await synthSpeech({
                    text: stage.text,
                    voice: settings.voice || "daniel",
                })

                const f: FileResult = await new Promise(async (res, rej) => {
                    const f = await file({ postfix: ".mp4" })
                    let videoInfo: any = await probe(speechFile)

                    const pngf = await file({ postfix: ".png" })

                    const st = createWriteStream(pngf.path)
                    await new Promise((res) =>
                        imageCanvas.createPNGStream().pipe(st).on("finish", res)
                    )

                    ffmpeg()
                        .input(pngf.path)
                        .inputOptions(["-loop 1"])
                        .input(speechFile)
                        .size(getResString(outWidth, outHeight))
                        .autopad()
                        .videoCodec("libx264")
                        .audioCodec("aac")
                        .audioFrequency(24000)
                        .audioChannels(2)
                        .duration(videoInfo.format.duration)
                        .outputOptions(["-pix_fmt yuv420p", "-r 25"])
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
            const pauseTime = Math.min(Math.abs(Number(stage.secs)), 10)
            if (pauseTime === 0.0) continue

            try {
                const f: FileResult = await new Promise(async (res, rej) => {
                    const f = await file({ postfix: ".mp4" })

                    const pngf = await file({ postfix: ".png" })

                    const st = createWriteStream(pngf.path)
                    await new Promise((res) =>
                        imageCanvas.createPNGStream().pipe(st).on("finish", res)
                    )

                    ffmpeg()
                        .input(pngf.path)
                        .inputOptions(["-loop 1"])
                        .input(
                            // Insert an empty audio stream, otherwise the
                            // pauses fuck up the rest of the vid
                            "anullsrc=cl=stereo:r=24000"
                        )
                        .inputOptions(["-f lavfi"])
                        .size(getResString(outWidth, outHeight))
                        .autopad()
                        .videoCodec("libx264")
                        .audioCodec("aac")
                        .audioFrequency(24000)
                        .audioChannels(2)
                        .duration(pauseTime)
                        .outputOptions(["-pix_fmt yuv420p", "-r 25"])
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
            blockingCtx.clearRect(
                stage.rect.x,
                stage.rect.y,
                stage.rect.width,
                stage.rect.height
            )
        } else if (stage.type === "gif") {
            const times = Math.min(Math.abs(stage.times), 10)

            const f: FileResult = await new Promise(async (res, rej) => {
                let f = await file({ postfix: ".mp4" })

                ffmpeg(image)
                    // .inputOptions(["-r 25"])
                    .input(
                        // Insert an empty audio stream, otherwise the
                        // pauses fuck up the rest of the vid
                        "anullsrc=cl=stereo:r=24000"
                    )
                    .inputOptions(["-f lavfi"])
                    .audioCodec("aac")
                    .audioFrequency(24000)
                    .audioChannels(2)
                    .size(getResString(outWidth, outHeight))
                    .autopad()
                    .videoCodec("libx264")
                    .outputOptions(["-pix_fmt yuv420p", "-shortest", "-r 25"])
                    .save(f.path)
                    .on("error", (err) =>
                        rej(
                            new Error(err || "Something with ffmpeg went wrong")
                        )
                    )
                    .on("end", () => res(f))
            })

            // Push the gif to the vids array as many times as needed!
            for (let i = 0; i < times; i++) vids.push(f.path)
        } else {
            console.log("unknown stage", stage)
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

    let f = ffmpeg()
        .input(tempPath)
        .inputOptions(["-f concat", "-safe 0", "-r 25"])
    return f
}

function getResString(width = 1920, height = 1080) {
    return width + "x" + height
}

function tsConcat(videoPaths: string[], outPath: string): Promise<void> {
    return new Promise((res, rej) => {
        ffmpeg("concat:" + videoPaths.join("|"))
            .audioCodec("copy")
            .videoCodec("copy")
            .on("end", res)
            .save(outPath)
    })
}

function simpleConcat(videoPaths: string[], outPath: string): Promise<void> {
    return new Promise((res, rej) => {
        getConcat(videoPaths)
            .inputFPS(25)
            .videoCodec("copy")
            .audioCodec("copy")
            .outputOptions(["-pix_fmt yuv420p"])
            .audioChannels(2)
            .fps(25)
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

function reencodedConcat(videoPaths: string[], outPath: string): Promise<void> {
    return new Promise((res, rej) => {
        getConcat(videoPaths)
            .inputFPS(25)
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions(["-pix_fmt yuv420p"])
            .audioChannels(2)
            .fps(25)
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
            .audioChannels(2)
            .fps(25)
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
    return new Promise((res, rej) => {
        ffmpeg(videoPath)
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions(["-pix_fmt yuv420p"])
            .audioChannels(2)
            .fps(25)
            .audioFrequency(24000)
            .save(outPath)
            .on("end", res)
            .on("error", rej)
    })
}
