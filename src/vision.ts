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

// https://ourcodeworld.com/articles/read/278/how-to-split-an-array-into-chunks-of-the-same-size-easily-in-javascript
function chunkArray<T>(myArray: T[], chunk_size: number): T[][] {
    let tempArray: T[][] = []

    for (let index = 0; index < myArray.length; index += chunk_size) {
        let myChunk = myArray.slice(index, index + chunk_size)
        tempArray.push(myChunk)
    }

    return tempArray
}

function flat<T>(arr: T[][]): T[] {
    return arr.reduce((flat, val) => flat.concat(val), [])
}

export async function readImages(imageObjects: ImageObject[]): Promise<any[]> {
    // TODO: use { image: { source: "http://dsa.com/dsa.png" } }
    // linking directly to the S3 store where the imgs are held
    // https://cloud.google.com/vision/quotas
    // Maximum is 16/request
    const chunks = chunkArray(imageObjects, 8)

    const results: any[] = []

    // Do it synchronously instead of parallelly, since it
    // gives problems with RESOURCE_EXCEEDED: Bandwidth exhausted
    // Also, image req doesn't take too long either way
    for (const images of chunks) {
        console.log("Reading chunk...")
        const res = await client.batchAnnotateImages({
            requests: images.map((i) => ({
                features: [{ type: "TEXT_DETECTION" }],
                image: {
                    content: readFileSync(i.image),
                },
                // To avoid english chars showing up as cyrillic: (only happened once, but it was a bitch to debug)
                imageContext: { languageHints: ["en"] },
            })),
        })
        if (res[0]?.responses) {
            results.push(...res[0].responses)
        } else {
            console.log("Chunk came up empty")
        }
    }
    console.log("Finished chunk")

    // const promises = chunks.map((images) =>
    //     client.batchAnnotateImages({
    //         requests: images.map((i) => ({
    //             features: [{ type: "TEXT_DETECTION" }],
    //             image: { content: readFileSync(i.image) },
    //             // To avoid english chars showing up as cyrillic:
    //             imageContext: { languageHints: ["en"] },
    //         })),
    //     })
    // )
    // const responseChunks = await Promise.all(promises)
    // const results = flat(
    //     responseChunks.map((r) =>
    //         r[0] && r[0].responses ? r[0].responses : []
    //     )
    // )
    return results
}
