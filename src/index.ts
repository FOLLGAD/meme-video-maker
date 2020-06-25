import Tesseract, { Rectangle } from 'tesseract.js'

import { synthSpeech } from './synth.js'

// Could also use gm for image manipulation: https://github.com/aheckmann/gm
import Canvas from 'canvas'

const { createWorker } = Tesseract

const worker = createWorker({
    // logger: m => console.log(m)
})

const rectangle = {
    left: 200,
    top: 70,
    width: 500,
    height: 200,
}

const meme = "https://i.kym-cdn.com/photos/images/newsfeed/001/763/384/709.jpg"

interface ImageReader {
    alwaysShow: [Rectangle];
    reads: [Rectangle];
}

async function makeImageThing(image: string | Buffer, imageReader: ImageReader) {
    const canvas = await Canvas.loadImage(image)
    const { width, height } = canvas
    const blockingCanvas = await Canvas.createCanvas(canvas.width, canvas.height)
    const blockingColor = "#000000"
    const ctx = blockingCanvas.getContext("2d")
    ctx.fillStyle = blockingColor
    ctx.fillRect(0, 0, width, height)

    imageReader.alwaysShow.forEach(d => {
        ctx.clearRect(d.left, d.top, d.width, d.height)
    })

    for (let readRect of imageReader.reads) {
        // Clear text
        ctx.clearRect(0, 0, width, readRect.top + readRect.width)
        let textToRead = await readImagePart(image, readRect)
        let speechFile = await synthSpeech({ text: textToRead, voice: "daniel" })
    }
}

readImagePart(meme, rectangle)

async function readImagePart(image: string | Buffer, rectangle: Rectangle) {
    await worker.load()
    await worker.loadLanguage('eng')
    await worker.initialize('eng')

    // Maybe use Google Vision https://cloud.google.com/vision/pricing instead? Faster
    const { data: { text } } = await worker.recognize(image, { rectangle })

    await worker.terminate()

    return text
}
