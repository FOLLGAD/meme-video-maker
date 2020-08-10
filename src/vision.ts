import vision from "@google-cloud/vision"

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
const client = new vision.ImageAnnotatorClient({})

export async function readImages(imageObject: ImageObject[]) {
	const promises = imageObject.map((i) => {
		return client.textDetection(i.image)
	})
	return await Promise.all(promises)
}
