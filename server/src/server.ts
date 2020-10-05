import * as cors from "@koa/cors"
// AWS
import * as AWS from "aws-sdk"
import { ScanOutput } from "aws-sdk/clients/dynamodb"
import { ListObjectsOutput } from "aws-sdk/clients/s3"
// Load env variables
import { config } from "dotenv"
import { createReadStream, existsSync, writeFileSync } from "fs"
import * as Koa from "koa"
// setup multipart upload for koa
import * as koaMultiBody from "koa-body"
import * as koaBodyParser from "koa-bodyparser"
import * as Router from "koa-router"
import { file } from "tmp-promise"
import { v4 as uuidv4 } from "uuid"
import { makeVids, normalizeVideo, Pipeline } from "./video"
import { readImages } from "./vision"

config()

// AWS S3
const s3 = new AWS.S3()

// AWS DynamoDB
const dynamodb = new AWS.DynamoDB({
    apiVersion: "2012-08-10",
    region: "eu-central-1",
})

// S3 Buckets
const Bucket = "4chan-app"
const FilesBucket = "4chan-files"
const MemesBucket = "carp-memes"
// DynamoDB table
const dbThemeName = "4chan-themes"

const koaBody = koaMultiBody({
    multipart: true,
    formidable: {
        keepExtensions: true,
        maxFileSize: 1000 * 1024 * 1024, // 1000mb is max uploaded filesize
    },
})
const koaLargeBody = koaMultiBody({
    multipart: true,
    formidable: {
        keepExtensions: true,
        maxFileSize: 40 * 1024 * 1024, // 40mb for intros & outros and more
    },
})

const bodyParser = koaBodyParser()

const app = new Koa()
const router = new Router()

app.use(cors())

const cache = new Map()

const queue: (() => Promise<void>)[] = []
let currentlyRunning = false

async function addToQueue(fn: () => Promise<void>) {
    queue.push(fn)
    if (!currentlyRunning) {
        currentlyRunning = true
        while (queue.length > 0) {
            const job = queue.shift()

            if (!job) continue
            try {
                await job()
            } catch (err) {
                console.error("An error ocurred")
                console.error(err)
            }
        }
        currentlyRunning = false
    }
}

async function getFile(s3_key: string): Promise<string> {
    if (cache.has(s3_key) && existsSync(cache.get(s3_key).path)) {
        return cache.get(s3_key).path
    } else {
        return await new Promise((res, rej) =>
            s3.getObject(
                {
                    Bucket: FilesBucket,
                    Key: s3_key,
                },
                async (err, data) => {
                    if (err || !data.Body) return rej(err)

                    const f = await file({ postfix: s3_key })
                    writeFileSync(f.path, data.Body as any)
                    cache.set(s3_key, f)

                    res(f.path)
                }
            )
        )
    }
}

// Produces a time-based name that also has a random component after.
// Sorting these names (Ex: Amazon S3) will make the newest file appear first until year 2100
const generateName = () => {
    const now = new Date()
    const currentDate = parseInt(
        (now.getUTCFullYear() - 2000).toString().padStart(2, "0") +
            now.getUTCMonth().toString().padStart(2, "0") +
            now.getUTCDate().toString().padStart(2, "0") +
            now.getUTCHours().toString().padStart(2, "0") +
            now.getUTCMinutes().toString().padStart(2, "0")
    )
    // CurrentDate = YYYYMMDDHHmm
    const nextCentury = 9911312359
    return (
        "4chan-" +
        (nextCentury - currentDate).toString(36) + // Get the time until next century, in base 36
        "-" +
        uuidv4().slice(0, 8) +
        ".mp4"
    )
}

const logDate = () => new Date().toLocaleString()

async function makeVid(rawSet, pipeline: Pipeline[], images): Promise<void> {
    const settings = {
        ...rawSet,
        intro: rawSet.intro ? await getFile(rawSet.intro) : undefined,
        transition: rawSet.transition
            ? await getFile(rawSet.transition)
            : undefined,
        outro: rawSet.outro ? await getFile(rawSet.outro) : undefined,
        song: rawSet.song ? await getFile(rawSet.song) : undefined,
    }

    console.log(logDate(), "Making video...")

    return await makeVids(
        pipeline,
        images.map((i) => i.image),
        settings
    ).then((vid) => {
        console.log(logDate(), "Video finished on ", vid)
        const now = new Date()

        const expires = new Date()
        expires.setMonth(now.getMonth() + 1)

        const name = generateName()

        return new Promise((res, rej) => {
            s3.upload(
                {
                    Bucket,
                    Body: createReadStream(vid),
                    Key: name,
                    Expires: expires, // HTTP-date
                },
                (err) => (err ? rej(err) : res())
            )
        })
    })
}

const parseFiles = (info: any[], files): { id: number; image: string }[] => {
    // Special case when only one file is sent
    if (files.files.path) {
        return [{ id: 0, image: files.files.path }]
    }

    return info.map((a) => {
        const file = files.files[a.id]
        if (file) {
            return { image: file.path, id: parseInt(a.id) }
        } else {
            throw new Error("Image wasn't found")
        }
    })
}

router
    // .get("/signed-uploads", async (ctx) => {
    //     let amount = ctx.query.amount || 1
    //     let a: string[] = []
    //     try {
    //         for (let i = 0; i < amount; i++) {
    //             let key = uuidv4()
    //             let p: string = await new Promise((res, rej) => {
    //                 s3.getSignedUrl(
    //                     "putObject",
    //                     { Bucket: MemesBucket, Key: key },
    //                     (err, url) => {
    //                         err ? rej(err) : res(url)
    //                     }
    //                 )
    //             })
    //             a.push(p)
    //         }
    //     } catch (err) {
    //         ctx.status = 500
    //         ctx.body = { error: "disdn't owrk for some reason" }
    //     }
    // })
    .post("/vision", koaBody, async (ctx) => {
        // id corresponds to an entry
        const { files, body } = ctx.request
        const info: { id: number }[] = JSON.parse(body.info)

        const images = parseFiles(info, files)

        const res = await readImages(images)

        ctx.body = res
    })
    .post("/make-vid", koaBody, async (ctx) => {
        const { files, body } = ctx.request
        const images = parseFiles(JSON.parse(body.info), files)

        const pipeline: Pipeline[] = JSON.parse(body.pipeline)
        const rawSet: any = JSON.parse(body.settings)

        addToQueue(() => makeVid(rawSet, pipeline, images))

        ctx.body = {
            success: true,
        }
    })
    .post("/upload-file", koaLargeBody, async (ctx) => {
        const { files } = ctx.request
        if (!files) throw new Error("Please send a file")
        const { path, name } = files.file

        try {
            const ext = name.substr(-4)
            const f = await file({ postfix: ext })

            let newPath = f.path
            if (ext === ".mp3") {
                // Do nothing, audio don't need preprocessing (??? citation needed)
                // Also, ffmpeg needs "libmp3lame" support for mp3 output for some darn reason
                newPath = path
            } else {
                await normalizeVideo(path, newPath)
            }

            await new Promise((res, rej) =>
                s3.upload(
                    {
                        Bucket: FilesBucket,
                        Body: createReadStream(newPath),
                        Key: name,
                    },
                    (err, data) => (err ? rej(err) : res(data))
                )
            )
            f.cleanup()

            console.log("Uploaded new file with name", name)

            ctx.body = {
                success: true,
            }
        } catch (err) {
            console.error(err)

            ctx.status = 400

            ctx.body = {
                success: false,
            }
        }
    })
    .get("/vids/:key", async (ctx) => {
        const data: any = await new Promise((res, rej) => {
            s3.getObject(
                {
                    Bucket,
                    Key: ctx.params.key,
                },
                (err, data) => {
                    err ? rej(err) : res(data)
                }
            )
        })

        // Write buffer to body
        ctx.body = data.Body
    })
    .get("/vids", async (ctx) => {
        const data: ListObjectsOutput = await new Promise((res, rej) => {
            s3.listObjects(
                {
                    Bucket,
                    MaxKeys: 10,
                },
                (err, data) => {
                    err ? rej(err) : res(data)
                }
            )
        })

        ctx.body = {
            data: data.Contents,
        }
    })
    .get("/files", async (ctx) => {
        const { Contents }: ListObjectsOutput = await new Promise(
            (res, rej) => {
                s3.listObjects(
                    {
                        Bucket: FilesBucket,
                        MaxKeys: 100,
                    },
                    (err, data) => {
                        err ? rej(err) : res(data)
                    }
                )
            }
        )

        if (!Contents) throw new Error("Couldn't list objects")

        const keys: string[] = Contents.map((d) => d.Key || "")

        // Return all the songs and videos in the files folder
        ctx.body = {
            videos: keys.filter((f: string) => f.slice(-4) === ".mp4"),
            songs: keys.filter((f: string) => f.slice(-4) === ".mp3"),
        }
    })
    .get("/themes", async (ctx) => {
        try {
            const { Items }: ScanOutput = await new Promise((res, rej) => {
                dynamodb.scan(
                    {
                        TableName: dbThemeName,
                    },
                    (err, data) => (err ? rej(err) : res(data))
                )
            })

            const data = Items!.map((item) => ({
                themeId: item.themeId.S,
                name: item.name.S,
                intro: item.intro?.S,
                transition: item.transition?.S,
                outro: item.outro?.S,
                voice: item.voice?.S,
                song: item.song?.S,
            }))

            ctx.body = data
        } catch (err) {
            console.error(err)
            ctx.status = 404
            ctx.body = {
                success: false,
            }
        }
    })
    .post("/themes", bodyParser, async (ctx) => {
        const { intro, transition, outro, song, voice, name } = ctx.request.body

        if (!name) {
            ctx.status = 400
            ctx.body = {
                success: false,
                message: "name is required",
            }
            return
        }

        const checker = (s) => (s && s.length ? { S: s } : undefined)

        const Item: any = {
            themeId: {
                S: uuidv4(),
            },
            name: {
                S: name,
            },
            intro: checker(intro),
            transition: checker(transition),
            outro: checker(outro),
            song: checker(song),
            voice: checker(voice),
        }

        await new Promise((res, rej) =>
            dynamodb.putItem(
                {
                    Item,
                    TableName: dbThemeName,
                },
                (err, data) => (err ? rej(err) : res(data))
            )
        )

        ctx.body = {
            success: true,
        }
    })
    .delete("/themes/:themeId", bodyParser, async (ctx) => {
        try {
            await new Promise((res, rej) =>
                dynamodb.deleteItem(
                    {
                        Key: { themeId: { S: ctx.params.themeId } },
                        TableName: dbThemeName,
                    },
                    (err, data) => (err ? rej(err) : res(data))
                )
            )
            ctx.body = { success: true }
        } catch (error) {
            console.error(error)
            ctx.status = 404
            ctx.body = { success: false }
        }
    })

// Error handling
app.use(async (ctx, next) => {
    try {
        await next()
    } catch (err) {
        ctx.status = err.statusCode || err.status || 500
        ctx.body = { error: err.message }
        ctx.app.emit("error", err, ctx)
    }
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(7000, () => console.log("Listening right now on port 7000"))
