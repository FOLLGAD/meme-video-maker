// TODO: Could also use gm for image manipulation: https://github.com/aheckmann/gm
import * as Canvas from "canvas"
import * as ffmpeg from "fluent-ffmpeg"
import { createWriteStream, writeFileSync } from "fs"
import { join } from "path"
import { file, FileResult, fileSync, setGracefulCleanup } from "tmp-promise"
import { synthSpeech } from "./synth"

// For forking this process
process.on(
    "message",
    async ([pipes, images, videosettings]: [
        Pipeline[],
        string[],
        VideoSettings
    ]) => {
        try {
            const vidPath = await makeVids(pipes, images, videosettings)
            process.send!({ isError: false, data: vidPath })
        } catch (error) {
            process.send!({ isError: true, data: error })
        }
    }
)

setGracefulCleanup()

const blockColor = "black"

export interface Rec {
    x: number
    y: number
    height: number
    width: number
}

interface Read {
    rect: Rec[]
    line?: number
    text: string
}

export interface ReadStage {
    type: "read"
    joinNext?: boolean
    reads: Read[]
    rect: Rec[]
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

export type ImageSettings = {
    showFirst: false
}

export type Pipeline = { pipeline: Stage[]; settings?: ImageSettings }
export type PipelineImg = {
    pipeline: Stage[]
    settings?: ImageSettings
    image: string
}

const timestampToSeconds = (timestamp: string) => {
    let [h, m, s, ms] = timestamp.split(/[:.]/)

    return (
        parseInt(h) * 60 * 60 +
        parseInt(m) * 60 +
        parseInt(s) +
        parseFloat("0." + ms)
    )
}

// Ffprobe
// Usually takes ~40ms
const probe = function (path: string) {
    return new Promise((res, rej) => {
        ffmpeg.ffprobe(path, (err, data) => {
            if (err) rej(err)
            else res(data)
        })
    })
}

interface VideoSettings {
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

async function parallell(imageReaders: PipelineImg[], settings: VideoSettings) {
    const promises = imageReaders.map((_, i) => {
        return makeImageThing(imageReaders[i], settings)
    })
    return await Promise.all(promises)
}

async function serial(imageReaders: PipelineImg[], settings: VideoSettings) {
    const arr: (string | null)[] = []
    for (let i = 0; i < imageReaders.length; i++) {
        console.log("Index:", i)
        const result = await makeImageThing(imageReaders[i], settings)
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

    const f = await file({ postfix: ".mp4" })

    await new Promise((r, x) =>
        ffmpeg(vidPAth)
            .size(getResString(w, h))
            .autopad()
            .audioCodec("aac")
            .outputOptions(["-pix_fmt yuv420p"])
            .audioFrequency(22050)
            .audioChannels(1)
            .fps(25)
            .videoCodec("libx264")
            .save(f.path)
            .on("end", r)
            .on("error", x)
    )

    return f.path
}

export async function makeVids(
    pipes: Pipeline[],
    images: string[],
    videoSettings: VideoSettings
): Promise<string> {
    const pipelines = pipes.map((p, i) => ({ ...p, image: images[i] }))

    videoSettings.outWidth = videoSettings.outWidth || 1920
    videoSettings.outHeight = videoSettings.outHeight || 1080

    if (videoSettings.outWidth > 10000 || videoSettings.outHeight > 10000)
        throw new Error("Too large video dimensions bro")

    console.log("Making clips...")
    const filteredPipelines = pipelines.filter(
        (p) => !p.settings || !p.settings.showFirst
    )
    const vidsMidOrNull = await serial(filteredPipelines, videoSettings)
    let vidsMid = vidsMidOrNull.filter(notEmpty)

    if (videoSettings.transition)
        vidsMid = intersperse(vidsMid, videoSettings.transition)

    let out = await file({ postfix: ".mp4" })

    console.log("Concatting w/ transitions")
    await simpleConcat(vidsMid, out.path)

    if (videoSettings.song) {
        const songout = await file({ postfix: ".mp4" })

        console.log("Adding song")

        await combineVideoAudio(out.path, videoSettings.song!, songout.path)

        out.cleanup()
        out = songout
    }

    const vidsFull = [out.path]

    if (videoSettings.intro)
        vidsFull.unshift(
            await convToDims(
                videoSettings.intro,
                videoSettings.outWidth,
                videoSettings.outHeight
            )
        )
    if (videoSettings.outro)
        vidsFull.push(
            await convToDims(
                videoSettings.outro,
                videoSettings.outWidth,
                videoSettings.outHeight
            )
        )

    const introVids = pipelines.filter(
        (p) => p.settings && p.settings.showFirst
    )

    if (introVids.length > 0) {
        const vidsMidOrNull = await serial(introVids, videoSettings)
        const vidsMid = vidsMidOrNull.filter(notEmpty)
        vidsFull.unshift(...vidsMid)
    }

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
    pipelineObj: PipelineImg,
    videoSettings: VideoSettings
): Promise<string | null> {
    const { pipeline } = pipelineObj

    if (pipeline.length === 0) {
        return null
    }

    const loadedImage = await Canvas.loadImage(pipelineObj.image)
    const { width, height } = loadedImage
    const imageCanvas = Canvas.createCanvas(width, height)
    const imageCanvCtx = imageCanvas.getContext("2d")

    // Create the canvas that will cover the image
    const blockingCanvas = Canvas.createCanvas(width, height)
    // ...and fill it black
    const blockingCtx = blockingCanvas.getContext("2d")
    blockingCtx.fillStyle = blockColor
    blockingCtx.fillRect(0, 0, width, height)

    // Init: fill the canvas with the blocked one
    imageCanvCtx.drawImage(blockingCanvas, 0, 0, width, height)

    const vids: string[] = []

    const processStage = (stage: Stage): void => {
        if (stage.type === "reveal") {
            blockingCtx.clearRect(
                stage.rect.x,
                stage.rect.y,
                stage.rect.width,
                stage.rect.height
            )
        } else if (stage.type === "read") {
            // if blocking, should show the screen up until this point but block the areas themselves
        }
    }

    const getSnapshot = async (): Promise<FileResult> => {
        const pngf = await file({ postfix: ".png" })

        const st = createWriteStream(pngf.path)
        await new Promise((res, rej) =>
            imageCanvas
                .createPNGStream()
                .pipe(st)
                .on("finish", res)
                .on("error", rej)
        )

        return pngf
    }

    for (let i = 0; i < pipeline.length; i++) {
        console.time("render_stage")
        const stage = pipeline[i]
        console.log("stage:", stage.type)
        // if (stage.type === "read") {
        //     if (stage.reveal) {
        //         // Clear text
        //         stage.rect.forEach((rect) =>
        //             blockingCtx.clearRect(0, 0, width, rect.y + rect.height)
        //         )
        //     }
        // }

        // Replace the canvas with the image
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
            .slice(i + 1) // all stages after the current one...
            .filter((s): s is ReadStage => s.type === "read" && s.blockuntil) // that are read and blockuntil...
            .forEach(({ rect }) => {
                rect.forEach(
                    (r) => imageCanvCtx.fillRect(r.x, r.y, r.width, r.height) // ...fill up all areas covered by the read
                )
            })

        if (stage.type === "read") {
            let speechDone = false,
                pngDone = false,
                ffmpegDone = false
            try {
                console.time("synth_speech")
                const { path: speechFile, segments } = await synthSpeech({
                    text: stage.reads.map((r) => r.text),
                    voice: videoSettings.voice || "daniel",
                })
                console.timeEnd("synth_speech")
                speechDone = true

                let realSegments: number[] = segments
                    .map(timestampToSeconds)
                    .map((t, i, a) =>
                        i === a.length - 1 ? t + 0.2 : Math.max(0, t - 0.2)
                    )

                // for every segment, do the thing

                const pngs: FileResult[] = []
                for (let i = 0; i < stage.reads.length; i++) {
                    const read = stage.reads[i]
                    // Clear this read from the blocker
                    read.rect.forEach((rect) => {
                        blockingCtx.clearRect(0, 0, width, rect.y + rect.height)
                    })

                    for (let q = i + 1; q < stage.reads.length; q++) {
                        if (
                            !stage.reads[q].line ||
                            stage.reads[q].line !== read.line
                        )
                            break

                        stage.reads[q].rect.forEach(
                            (r) =>
                                blockingCtx.fillRect(
                                    r.x,
                                    r.y,
                                    r.width,
                                    r.height
                                ) // ...fill up all areas covered by the read
                        )
                    }

                    // draw the image on the canvas
                    imageCanvCtx.drawImage(loadedImage, 0, 0, width, height)
                    // draw the blocker to the canvas
                    imageCanvCtx.drawImage(blockingCanvas, 0, 0, width, height)
                    const pngf = await getSnapshot()

                    pngs.push(pngf)
                }

                pngDone = true

                const videoClips: FileResult[] = []

                for (let i = 0; i < pngs.length; i++) {
                    const png = pngs[i]
                    const f = await file({ postfix: ".mp4" })

                    await new Promise((res, rej) => {
                        ffmpeg(png.path)
                            .inputOptions(["-loop 1"])
                            .input(speechFile)
                            .size(
                                getResString(
                                    videoSettings.outWidth,
                                    videoSettings.outHeight
                                )
                            )
                            .autopad()
                            .videoCodec("libx264")
                            .audioCodec("aac")
                            .audioFrequency(22050)
                            .audioChannels(1)

                            // Pick the correct part of the video
                            .seek(realSegments[i - 1] || 0)
                            .duration(
                                realSegments[i] - (realSegments[i - 1] || 0)
                            )

                            .outputOptions(["-pix_fmt yuv420p", "-r 25"])
                            .save(f.path)
                            .on("error", (err) =>
                                rej(
                                    new Error(
                                        err ||
                                            "Something with ffmpeg went wrong"
                                    )
                                )
                            )
                            .on("end", () => res(f))
                    })

                    videoClips.push(f)
                }
                ffmpegDone = true

                const out = await file({ postfix: ".mp4" })

                await simpleConcat(
                    videoClips.map((v) => v.path),
                    out.path
                )

                vids.push(out.path)
            } catch (err) {
                console.error("MakeImageThing:", err)
                console.error("s,p,f", speechDone, pngDone, ffmpegDone)
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
                            "anullsrc=cl=mono:r=22050"
                        )
                        .inputOptions(["-f lavfi"])
                        .size(
                            getResString(
                                videoSettings.outWidth,
                                videoSettings.outHeight
                            )
                        )
                        .autopad()
                        .videoCodec("libx264")
                        .audioCodec("aac")
                        .audioFrequency(22050)
                        .audioChannels(1)
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
                const f = await file({ postfix: ".mp4" })

                ffmpeg(pipelineObj.image)
                    // .inputOptions(["-r 25"])
                    .input(
                        // Insert an empty audio stream, otherwise the
                        // pauses fuck up the rest of the vid
                        "anullsrc=cl=mono:r=22050"
                    )
                    .inputOptions(["-f lavfi"])
                    .audioCodec("aac")
                    .audioFrequency(22050)
                    .audioChannels(1)
                    .size(
                        getResString(
                            videoSettings.outWidth,
                            videoSettings.outHeight
                        )
                    )
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
        console.timeEnd("render_stage")
    }

    if (vids.length === 0) {
        return null
    }

    const out = await file({ postfix: ".mp4" })
    await simpleConcat(vids, out.path)

    return out.path
}

function getConcat(videoPaths) {
    const txt = fileSync({ postfix: ".txt" })
    const tempPath = txt.name

    writeFileSync(
        tempPath,
        "ffconcat version 1.0\n" +
            videoPaths.map((d) => `file '${d}'\n`).join(""),
        {
            encoding: "utf-8",
        }
    )

    console.log(videoPaths)

    const f = ffmpeg()
        .input(tempPath)
        .inputFps(25)
        .inputOptions(["-f concat", "-safe 0"])
        .on("progress", console.log)
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
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions(["-pix_fmt yuv420p"])
            .audioChannels(1)
            .fps(25)
            .on("end", () => {
                res()
            })
            .on("error", (err) => {
                console.log("failed simple concat")
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
            .audioChannels(1)
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
        const videoInfo: any = await probe(videoPath)

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
            .audioChannels(1)
            .fps(25)
            .audioFrequency(22050)
            .save(outPath)
            .on("end", res)
            .on("error", rej)
    })
}
