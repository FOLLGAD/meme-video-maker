"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vision_1 = require("@google-cloud/vision");
// Vision client
const client = new vision_1.default.ImageAnnotatorClient({ clientOptions: {} });
// https://ourcodeworld.com/articles/read/278/how-to-split-an-array-into-chunks-of-the-same-size-easily-in-javascript
function chunkArray(myArray, chunk_size) {
    let tempArray = [];
    for (let index = 0; index < myArray.length; index += chunk_size) {
        let myChunk = myArray.slice(index, index + chunk_size);
        tempArray.push(myChunk);
    }
    return tempArray;
}
// export async function readImages(images: string[]): Promise<any[]> {
//     // TODO: use { image: { source: "http://dsa.com/dsa.png" } }
//     // linking directly to the S3 store where the imgs are held
//     // https://cloud.google.com/vision/quotas
//     // Maximum is 16/request
//     const chunks = chunkArray(images, 16)
//     const results: any[] = []
//     // Do it synchronously instead of parallelly, since it
//     // gives problems with RESOURCE_EXCEEDED: Bandwidth exhausted
//     // Also, image req doesn't take too long either way
//     for (const images of chunks) {
//         console.log("Reading chunk...")
//         try {
//             const res = await client.batchAnnotateImages({
//                 requests: images.map((i) => ({
//                     features: [{ type: "TEXT_DETECTION" }],
//                     image: {
//                         content: readFileSync(i.image),
//                     },
//                     // To avoid english chars showing up as cyrillic: (only happened once, but it was a bitch to debug)
//                     imageContext: { languageHints: ["en"] },
//                 })),
//             })
//             if (res[0]?.responses) {
//                 results.push(...res[0].responses)
//             } else {
//                 console.log("Chunk came up empty")
//             }
//         } catch (err) {
//             console.error("chunk failed")
//             console.error(err)
//         }
//     }
//     console.log("Finished chunk")
//     // const promises = chunks.map((images) =>
//     //     client.batchAnnotateImages({
//     //         requests: images.map((i) => ({
//     //             features: [{ type: "TEXT_DETECTION" }],
//     //             image: { content: readFileSync(i.image) },
//     //             // To avoid english chars showing up as cyrillic:
//     //             imageContext: { languageHints: ["en"] },
//     //         })),
//     //     })
//     // )
//     // const responseChunks = await Promise.all(promises)
//     // const results = flat(
//     //     responseChunks.map((r) =>
//     //         r[0] && r[0].responses ? r[0].responses : []
//     //     )
//     // )
//     return results
// }
