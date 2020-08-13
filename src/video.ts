// TODO: Could also use gm for image manipulation: https://github.com/aheckmann/gm
import * as Canvas from "canvas"
import * as ffmpeg from "fluent-ffmpeg"
import { join } from "path"
import { dir, file } from "tmp-promise"
import { synthSpeech } from "./synth"

// Ffprobe
// Usually takes ~40ms
const probe = function (path) {
	return new Promise((res, rej) => {
		ffmpeg.ffprobe(path, (err, data) => {
			if (err) rej(err)
			else res(data)
		})
	})
}

export interface Rec {
	x: number
	y: number
	height: number
	width: number
}

export interface ImageReader {
	alwaysShow: [Rec]
	blocks: { block: Rec; text: string }[]
}

interface Settings {
	transition?: string
	intro?: string
	outro?: string
	song?: string
	voice?: string
}

export const filesPath = join(__dirname, "../files")

function intersperse(d: any[], sep: any): any[] {
	return d.reduce(
		(acc, val, i) => (i === 0 ? [...acc, val] : [...acc, sep, val]),
		[]
	)
}

async function parallell(
	imageReaders: ImageReader[],
	images: string[],
	settings: Settings
) {
	const promises = imageReaders.map((_, i) => {
		return makeImageThing(imageReaders[i], images[i], settings)
	})
	return await Promise.all(promises)
}

async function serial(
	imageReaders: ImageReader[],
	images: string[],
	settings: Settings
) {
	let arr: (string | null)[] = []
	for (let i = 0; i < imageReaders.length; i++) {
		console.log("Index:", i)
		const result = await makeImageThing(
			imageReaders[i],
			images[i],
			settings
		)
		arr.push(result)
	}
	return arr
}

function notEmpty<TValue>(value: TValue | null): value is TValue {
	return value !== null
}

export async function makeVids(
	imageReaders: ImageReader[],
	images: string[],
	settings: Settings
): Promise<string> {
	console.log("Making clips...")
	let vidsMidOrNull = await serial(imageReaders, images, settings)
	let vidsMid = vidsMidOrNull.filter(notEmpty)

	if (settings.transition) vidsMid = intersperse(vidsMid, settings.transition)

	const out = await file({ postfix: ".mp4" })

	console.log("Concatting w/ transitions")
	await simpleConcat(vidsMid, out.path)

	let vidsFull = [out.path]

	if (settings.song) {
		const songout = await file({ postfix: ".mp4" })

		console.log("Adding song")

		await combineVideoAudio(out.path, settings.song!, songout.path)

		vidsFull = [songout.path]
	}

	if (settings.intro) vidsFull.unshift(settings.intro)
	if (settings.outro) vidsFull.push(settings.outro)

	let vidPath = out
	if (vidsFull.length > 1) {
		// If has outro or intro
		vidPath = await file({ postfix: ".mp4" })
		console.log("Adding intro, outro")
		await simpleConcat(vidsFull, vidPath.path)
		out.cleanup()
	}

	return out.path
}

async function makeImageThing(
	imageReader: ImageReader,
	image: string,
	settings: Settings
): Promise<string | null> {
	if (imageReader.blocks.length === 0) {
		return null
	}

	const blockingColor = "#000000"

	const loadedImage = await Canvas.loadImage(image)
	const { width, height } = loadedImage
	const imageCanvas = await Canvas.createCanvas(width, height)
	const imageCanvCtx = imageCanvas.getContext("2d")

	// Create the canvas that will cover the image
	const blockingCanvas = await Canvas.createCanvas(width, height)
	// ...and fill it black
	const ctx = blockingCanvas.getContext("2d")
	ctx.fillStyle = blockingColor
	ctx.fillRect(0, 0, width, height)

	// Always show the alwaysShows area of the screen
	imageReader.alwaysShow &&
		imageReader.alwaysShow.forEach((d) => {
			ctx.clearRect(d.x, d.y, d.width, d.height)
		})

	let vids: string[] = []

	for (let i = 0; i < imageReader.blocks.length; i++) {
		const readRect = imageReader.blocks[i]

		// Clear text
		ctx.clearRect(0, 0, width, readRect.block.y + readRect.block.height)

		try {
			const speechFile = await synthSpeech({
				text: readRect.text,
				voice: settings.voice || "daniel",
			})

			const f: { path: string } = await new Promise(async (res, rej) => {
				const f = await file({ postfix: ".mp4" })

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
					.size("1920x1080")
					.aspect("16:9")
					.autopad()
					.audioCodec("aac")
					.outputOptions(["-pix_fmt yuv420p"])
					.audioFrequency(24000)
					.audioChannels(2)
					.fps(25)
					.videoCodec("libx264")
					.save(f.path)
					.on("error", (err) =>
						rej(
							new Error(err || "Something with ffmpeg went wrong")
						)
					)
					.on("end", () => res(f))
			})

			vids.push(f.path)
		} catch (err) {
			console.error("MakeImageThing:", err)
			// scene couldn't be rendered, so it won't be pushed to the video-list
		}
	}

	if (vids.length === 0) {
		return null
	}

	const out = await file({ postfix: ".mp4" })
	await simpleConcat(vids, out.path)

	return out.path
}

function simpleConcat(videoPaths: string[], outPath) {
	if (videoPaths.length === 0) {
		console.error("Warning: tried to concat an empty array!!")
		return Promise.reject()
	}

	return new Promise(async (res, rej) => {
		let tempdir = await dir()

		let f = ffmpeg()
		videoPaths.forEach((v) => {
			f.input(v)
		})
		f.outputOptions(["-preset veryfast"])
			.on("end", () => {
				res()
				tempdir.cleanup()
			})
			.on("error", (err) => {
				console.error(err)
				rej(err)
			})
			// @ts-ignore
			.mergeToFile(outPath, tempdir.path)
	})
}

// TODO: scroll long images with video

/* 
    Overlays audio over a video clip, repeating it ad inifinitum.
*/
function combineVideoAudio(videoPath, audioPath, outPath) {
	return new Promise(async (res, rej) => {
		let videoInfo: any = await probe(videoPath)

		ffmpeg(videoPath)
			.videoCodec("libx264")
			.input(audioPath)
			.audioCodec("aac")
			.inputOptions([
				"-stream_loop -1", // Repeats audio until it hits the previously set duration [https://stackoverflow.com/a/34280687/6912118]
			])
			.duration(videoInfo.format.duration) // Run for the duration of the video
			.complexFilter(["[0:a][1:a] amerge=inputs=2 [a]"])
			.fpsOutput(25)
			.outputOptions(["-map 0:v", "-map [a]"])
			.audioChannels(1)
			.on("end", () => {
				res()
			})
			.on("error", (err) => {
				console.error(err)
				rej()
			})
			.save(outPath)
	})
}

export function normalizeVideo(videoPath: string, outPath: string) {
	return new Promise((res, rej) =>
		ffmpeg(videoPath)
			.audioCodec("aac")
			.outputOptions(["-pix_fmt yuv420p"])
			.audioFrequency(24000)
			.audioChannels(2)
			.fps(25)
			.videoCodec("libx264")
			.save(outPath)
			.on("end", res)
			.on("error", rej)
	)
}
