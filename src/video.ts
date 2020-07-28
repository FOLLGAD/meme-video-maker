import * as ffmpeg from 'fluent-ffmpeg'
import { Rectangle } from './vision'
import { synthSpeech } from './synth'
const fs = require('fs')

import { file, dir } from 'tmp-promise'

// Could also use gm for image manipulation: https://github.com/aheckmann/gm
import * as Canvas from 'canvas'

export interface Rec {
    x: number;
    y: number;
    height: number;
    width: number;
}

export interface ImageReader {
    alwaysShow: [Rec];
    blocks: { block: Rec, text: string }[];
}

export async function makeVids(imageReaders: ImageReader[], images: string[]): Promise<string> {
    const promises = imageReaders.map((_, i) => {
        return makeImageThing(imageReaders[i], images[i])
    })
    const vids = await Promise.all(promises)

    const out = await file({ postfix: '.mp4' })

    await simpleConcat(vids.filter(v => v), out.path)

    return out.path
}

async function makeImageThing(imageReader: ImageReader, image: string | Buffer): Promise<string | null> {
    if (imageReader.blocks.length === 0) {
        return null
    }

    const blockingColor = "#000000"

    const loadedImage = await Canvas.loadImage(image)
    const { width, height } = loadedImage
    const imageCanvas = await Canvas.createCanvas(width, height)
    const imageCanvCtx = imageCanvas.getContext('2d')

    // Create the canvas that will cover the image
    const blockingCanvas = await Canvas.createCanvas(width, height)
    // ...and fill it black
    const ctx = blockingCanvas.getContext("2d")
    ctx.fillStyle = blockingColor
    ctx.fillRect(0, 0, width, height)

    // Always show the alwaysShows area of the screen
    imageReader.alwaysShow && imageReader.alwaysShow.forEach(d => {
        ctx.clearRect(d.x, d.y, d.width, d.height)
    })

    let vids: string[] = []

    for (let i = 0; i < imageReader.blocks.length; i++) {
        const readRect = imageReader.blocks[i]

        // Clear text
        ctx.clearRect(0, 0, width, readRect.block.y + readRect.block.height)

        const speechFile = await synthSpeech({ text: readRect.text, voice: "daniel" })

        const f: { path: string } = await new Promise(async (res, rej) => {
            const f = await file({ postfix: '.mp4' })

            imageCanvCtx.clearRect(0, 0, width, height)
            // Draw source
            imageCanvCtx.drawImage(loadedImage, 0, 0, width, height)
            if (i < imageReader.blocks.length - 1) {
                // Draw blockage
                imageCanvCtx.drawImage(blockingCanvas, 0, 0, width, height)
            }

            ffmpeg()
                .input(imageCanvas.createPNGStream())
                .input(image)
                .input(speechFile)
                .size('1920x1080')
                .aspect('16:9')
                .autopad()
                .audioCodec('aac')
                .fps(25)
                .videoCodec('libx264')
                .save(f.path)
                .on('error', rej)
                .on('end', () => res(f))
        })

        vids.push(f.path)
    }

    const out = await file({ postfix: '.mp4' })
    await simpleConcat(vids, out.path)

    return out.path
}

function simpleConcat(videoPaths, outPath) {
    return new Promise(async (res, rej) => {
        let tempdir = await dir()

        console.log(videoPaths)

        let f = ffmpeg()
        videoPaths.forEach(v => {
            f.input(v)
        })
        f
            .on('end', () => {
                console.log("done!")
                res()
                tempdir.cleanup()
            })
            .on('error', err => {
                console.error(err)
                rej(err)
            })
            .mergeToFile(outPath, tempdir.path)
    })
}
