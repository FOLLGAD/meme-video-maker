import * as cors from "@koa/cors"
// AWS
import * as AWS from "aws-sdk"
import { ScanOutput } from "aws-sdk/clients/dynamodb"
import { ListObjectsOutput } from "aws-sdk/clients/s3"
import { fork } from "child_process"
// Load env variables
import { config } from "dotenv"
import { createReadStream, existsSync, writeFileSync } from "fs"
import * as Koa from "koa"
// setup multipart upload for koa
import * as koaMultiBody from "koa-body"
import * as koaBodyParser from "koa-bodyparser"
import * as Router from "koa-router"
import { join } from "path"
import { file, FileResult } from "tmp-promise"
import { v4 as uuidv4 } from "uuid"
import { makeIntoS3Url } from "./utils"
import { normalizeVideo, Pipeline } from "./video"
import { readImages, readRemoteImages } from "./vision"

import * as jwt from "jsonwebtoken"
import * as bcrypt from "bcrypt"
const saltRounds = 10

config()
AWS.config.region = "eu-central-1"

// AWS S3
const s3 = new AWS.S3({ region: "eu-central-1" })

// AWS DynamoDB
const dynamodb = new AWS.DynamoDB({
    apiVersion: "2012-08-10",
    region: "eu-central-1",
})

// S3 Buckets
const Bucket = "carp-videos"
const FilesBucket = "carp-files"
const UploadsBucket = "carp-uploads"
// DynamoDB table
const dbThemeName = "4chan-themes"
const dbUsersName = "carp-users"

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

interface CustomKoaState {
    user?: { email: string }
}

const app = new Koa<CustomKoaState, {}>()
const router = new Router()

app.use(cors({ credentials: true }))

const cache = new Map()

const queue: (() => Promise<void>)[] = []
let currentlyRunning = false

async function addToQueue(fn: () => Promise<void>) {
    console.log("Added to queue")
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

                    const f = await file({ postfix: s3_key.replace("/", "_") })
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
    // CurrentDate =    YYMMDDHHmm
    const nextCentury = 9911312359
    return (
        "carp-" +
        (nextCentury - currentDate).toString(36) + // Get the time until next century, in base 36
        "-" +
        uuidv4().slice(0, 8) +
        ".mp4"
    )
}

const expectJson = (c) => {
    console.log(c.request)
    if (typeof c.request.body !== "object") {
        throw new Error("JSON required")
    }
}

const logDate = () => new Date().toLocaleString()

async function makeVid(rawSet, pipeline: Pipeline[]): Promise<FileResult> {
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

    const process = fork(join(__dirname, "./video"))

    process.send([pipeline, settings])

    return await new Promise<FileResult>((res, rej) => {
        process.on(
            "message",
            async ({
                isError,
                data,
                file,
            }: {
                isError: boolean
                data: any
                file: FileResult
            }) => {
                if (isError) return rej(data)

                console.log(logDate(), "Video finished on ", file.path)

                process.kill()

                res(file)
            }
        )

        process.on("error", (error) => {
            console.error(error)

            process.kill()

            rej(error)
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

const publicRouter = new Router()
    .post("/logout", koaBody, async (ctx) => {
        ctx.cookies.set("token")

        ctx.status = 204
    })
    .post("/auth", koaBody, async (ctx) => {
        const { email: reqEmail, password: reqPassword } = ctx.request.body

        ctx.assert(reqEmail, 400, "Please supply an email address")
        ctx.assert(reqPassword, 400, "Please supply a password")

        const data = await new Promise<AWS.DynamoDB.GetItemOutput>((res, rej) =>
            dynamodb.getItem(
                {
                    // Item,
                    Key: {
                        email: {
                            S: reqEmail,
                        },
                    },
                    TableName: dbUsersName,
                },
                (err, data) => (err ? rej(err) : res(data))
            )
        )
        if (!data.Item) {
            ctx.throw(400, "Wrong password or email")
            return
        }

        const { email, password } = data.Item
        const result = await bcrypt.compare(reqPassword, password.S!)

        if (result !== true) {
            ctx.throw(400, "Wrong password or email")
            return
        }

        const token = jwt.sign(
            {
                email: email.S,
            },
            process.env.JWT_SECRET!,
            { expiresIn: "30d" }
        )

        ctx.cookies.set("token", token, {
            httpOnly: true,
            overwrite: true,
        })

        ctx.body = token
    })

const authenticate = async (
    ctx: Koa.ParameterizedContext<
        CustomKoaState,
        Router.IRouterParamContext<CustomKoaState, {}>
    >,
    next: any
) => {
    const token = ctx.cookies.get("token") || ctx.header["access-token"]
    try {
        const payload: any = jwt.verify(token, process.env.JWT_SECRET!)
        ctx.state.user = { email: payload.email }
        await next()
    } catch (error) {
        ctx.status = 401
        return
    }
}

const namespaceKey = (name: string, key: string = ""): string => {
    if (!name) throw new Error("Warning: no name was supplied in NamepsaceKey")
    if (key.indexOf("/") !== -1)
        console.error("WARNING: Key contains /, this is not good!!")
    return `${name}/${key}`
}

const unNamespaceKey = (key: string): string => {
    return key.slice(key.lastIndexOf("/") + 1)
}

const inProgress: { email: string; name: string }[] = []

router
    // Require auth for everyone of these routes
    .use(authenticate)
    .post("/register", koaBody, async (ctx) => {
        const { email, password } = ctx.request.body

        if (email.length < 5) {
            ctx.throw(400, "Email must be at least 5 characters long")
        }
        if (password.length < 6) {
            ctx.throw(400, "Password must be at least 6 chars long")
        }
        if (email.includes("/")) {
            ctx.throw(400, "Email contains illegal characters")
        }

        const alreadyExists = await new Promise<AWS.DynamoDB.GetItemOutput>(
            (res, rej) =>
                dynamodb.getItem(
                    {
                        // Item,
                        Key: {
                            email: {
                                S: email,
                            },
                        },
                        TableName: dbUsersName,
                    },
                    (err, data) => (err ? rej(err) : res(data))
                )
        )
        if (alreadyExists.Item) {
            ctx.status = 500
            return
        }

        const hashed = await bcrypt.hash(password, saltRounds)

        await new Promise<AWS.DynamoDB.PutItemOutput>((res, rej) => {
            dynamodb.putItem(
                {
                    TableName: dbUsersName,
                    Item: {
                        email: { S: email },
                        password: { S: hashed },
                    },
                },
                (err, data) => (err ? rej(err) : res(data))
            )
        })

        ctx.status = 204
    })
    .post("/v2/get-signed-urls", async (ctx) => {
        const amount = parseInt(ctx.query.amount)
        if (amount <= 0 || amount > 500) {
            ctx.status = 400
            ctx.body = {
                success: false,
            }
            return
        }

        // https://blog.rocketinsights.com/uploading-images-to-s3-via-the-browser/

        let datas: AWS.S3.PresignedPost[] = []

        for (let i = 0; i < amount; i++) {
            const s3Params: AWS.S3.PresignedPost.Params = {
                Bucket: UploadsBucket,
                Fields: {
                    key: namespaceKey(ctx.state.user.email, uuidv4()), // Unique file name
                },
                Conditions: [
                    ["content-length-range", 0, 100000000],
                    ["starts-with", "$Content-Type", "image/"],
                    // ["eq", "$x-amz-meta-user-id", userId],
                ],
                // ContentType: fileType
            }

            const data = s3.createPresignedPost(s3Params)
            datas.push(data)
        }

        ctx.body = datas
    })
    .post("/v2/vision", bodyParser, async (ctx) => {
        const { body } = ctx.request

        const imageUrls = body.map(makeIntoS3Url)

        const data = await readRemoteImages(imageUrls)

        ctx.body = data
    })
    .post("/v2/render", bodyParser, async (ctx) => {
        const { body } = ctx.request

        const {
            pipeline,
            settings,
        }: { pipeline: Pipeline[]; settings: any } = body

        const name = generateName()

        inProgress.push({ email: ctx.state.user.email, name })
        console.log(inProgress)

        const now = new Date()
        const expires = new Date()
        expires.setMonth(now.getMonth() + 1)

        addToQueue(() =>
            makeVid(settings, pipeline).then(async (file) => {
                await new Promise((r1, e1) => {
                    s3.upload(
                        {
                            Bucket,
                            Body: createReadStream(file.path),
                            Key: namespaceKey(ctx.state.user.email, name),
                            Expires: expires, // HTTP-date
                        },
                        (err) => (err ? e1(err) : r1())
                    )
                })
                inProgress.splice(
                    inProgress.findIndex((d) => d.name === name),
                    1
                )
            })
        )

        ctx.body = {
            success: true,
        }
    })
    // TODO: This can be replaced with a lambda that
    // automatically normalizes S3 files and puts them in a "finished" folder
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
                        Key: namespaceKey(ctx.state.user.email, name),
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
                    Key: namespaceKey(ctx.state.user.email, ctx.params.key),
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
                    Prefix: namespaceKey(ctx.state.user.email),
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
            inProgress: inProgress.filter(
                (p) => p.email === ctx.state.user.email
            ),
        }
    })
    .get("/files", async (ctx) => {
        const { Contents }: ListObjectsOutput = await new Promise(
            (res, rej) => {
                s3.listObjectsV2(
                    {
                        Bucket: FilesBucket,
                        Prefix: namespaceKey(ctx.state.user.email),
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
                        FilterExpression: "email = :ownerEmail",
                        ExpressionAttributeValues: {
                            ":ownerEmail": { S: ctx.state.user.email },
                        },
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
            email: { S: ctx.state.user.email },
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
                        Key: {
                            themeId: { S: ctx.params.themeId },
                            email: { S: ctx.state.user.email },
                        },
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

app.use((ctx, next) => {
    // Logging
    let user = ctx.state.user ? ctx.state.user.email : "unauthed"
    console.log(
        `${ctx.method} ${ctx.url} - ${new Date().toISOString()} ${user}`
    )
    return next()
})

app.use(publicRouter.routes()).use(publicRouter.allowedMethods())

app.use(router.routes()).use(router.allowedMethods())

app.listen(7000, () => console.log("Listening right now on port 7000"))
