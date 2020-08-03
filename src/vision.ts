// import * as Tesseract from 'tesseract.js'
// const { createWorker } = Tesseract

// const worker = createWorker({
//     logger: m => console.log(m)
// })

import vision from '@google-cloud/vision'

export interface Rectangle {
    left: number;
    top: number;
    width: number;
    height: number;
}

interface ImageObject {
    image: string | Buffer;
}

// Vision client
const client = new vision.ImageAnnotatorClient({});

export async function readImages(imageObject: ImageObject[]) {
    const promises = imageObject.map((i) => {
        return client.textDetection(i.image)
    })
    return await Promise.all(promises)
}

// visionReadImage(meme).then(a => console.log(a))

// async function visionReadImage(image: string | Buffer) {
//     const [result] = await client.textDetection(image)
//     const detects = result.textAnnotations
//     return detects?.join(" ") || ""
// }

// tesseractReadImagePart(meme, rectangle)

// async function tesseractReadImagePart(image: string | Buffer, rectangle: Rectangle) {
//     await worker.load()
//     await worker.loadLanguage('eng')
//     await worker.initialize('eng')

//     // Maybe use Google Vision https://cloud.google.com/vision/pricing instead? Faster
//     const { data: { text } } = await worker.recognize(image, { rectangle })

//     await worker.terminate()

//     return text
// }
