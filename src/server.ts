import * as Koa from 'koa'
import * as Router from 'koa-router'
import { ImageReader, makeVids } from './video'
import { readdir } from 'fs'
import { join } from 'path'
import { promisify } from 'util'
const tmp = require('tmp')
const { readImages } = require('./vision')
const cors = require('@koa/cors')

const uploadDir = tmp.dirSync()
const koaBody = require('koa-body')({ multipart: true, uploadDir: uploadDir.path })

const app = new Koa()
const router = new Router()

app.use(cors())

const parseFiles = (info, files): { id: Number, image: string }[] => info.map(a => {
    let file = files.files[a.id]
    if (file) {
        return { image: file.path, id: parseInt(a.id) }
    } else {
        throw new Error("Image wasn't found")
    }
})

router
    .get('/', async (ctx) => {
        ctx.body = "Hello!"
    })
    .post('/vision', koaBody, async (ctx, next) => {
        // id corresponds to an entry
        const { files, body } = ctx.request
        const info: { id: number }[] = JSON.parse(body.info)

        const images = parseFiles(info, files)

        const res = await readImages(images)

        const fs = require('fs')
        fs.writeFileSync('data.json', JSON.stringify(res))

        ctx.body = res
    })
    .post('/make-vid', koaBody, async (ctx, next) => {
        const { files, body } = ctx.request
        const images = parseFiles(JSON.parse(body.info), files)

        const enabled: ImageReader[] = JSON.parse(body.enabled)
        const editing: {
            transition: string | null,
            intro: string | null,
            outro: string | null,
            song: string | null,
        } = JSON.parse(body.editing)

        console.log(enabled[0].alwaysShow)

        const vid = await makeVids(enabled, images.map(i => i.image))
        console.log("FINAL VID: ", vid)

        ctx.body = {
            message: "Hello!"
        }
    })
    .get('/files', async (ctx, next) => {
        const dir = await promisify(readdir)(join(__dirname, '../files'), { encoding: "utf8" })

        // Return all the songs and videos in the files folder
        ctx.body = {
            videos: dir.filter((f: string) => f.slice(-4) === ".mp4"),
            songs: dir.filter((f: string) => f.slice(-4) === ".mp3"),
        }
    })

app.use(router.routes())

app.listen(7000, () => console.log("Listening on port 7000"))
