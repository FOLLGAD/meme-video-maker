import vision from "@google-cloud/vision"
import { readFileSync } from "fs"

export interface Rectangle {
    left: number
    top: number
    width: number
    height: number
}

interface ImageObject {
    image: string | Buffer
}

// Vision client
const client = new vision.ImageAnnotatorClient({ clientOptions: {} })

export async function readImages(imageObject: ImageObject[]) {
    // TODO: use { image: { source: "http://dsa.com/dsa.png" } }
    // linking directly to the S3 store where the imgs are held
    // requests: [{ image: { source: string } }]
    // Can also group everything into one single request??
    const [res] = await client.batchAnnotateImages({
        requests: imageObject.map((i) => ({
            features: [{ type: "TEXT_DETECTION" }],
            image: { content: readFileSync(i.image) },
            // To avoid english chars showing up as cyrillic:
            imageContext: { languageHints: ["en"] },
        })),
    })
    return res.responses
}
