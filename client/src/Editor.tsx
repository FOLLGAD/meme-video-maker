import React, { useMemo, useReducer, useState } from "react"
import EditImage from "./EditImage"
import Settings from "./Settings"
import { estimateTimePretty } from "./timeCalc"
import { preSanitize } from "./sanitize"

interface Rect {
    x: number
    y: number
    width: number
    height: number
}

interface Vertex {
    x: number
    y: number
}

interface BoundingPoly {
    vertices: [Vertex, Vertex, Vertex, Vertex]
}

const getOuterBounds = ({ vertices }: BoundingPoly): Rect => {
    let xs = vertices.map(({ x }) => x)
    let ys = vertices.map(({ y }) => y)
    let xmin = Math.min(...xs)
    let ymin = Math.min(...ys)
    let xmax = Math.max(...xs)
    let ymax = Math.max(...ys)

    return {
        x: xmin,
        y: ymin,
        width: xmax - xmin,
        height: ymax - ymin,
    }
}

const expandOuterBounds = (rects: Rect[]): Rect => {
    let minx = Math.min(...rects.map(({ x }) => x))
    let miny = Math.min(...rects.map(({ y }) => y))
    let xws = rects.map(({ x, width }) => x + width)
    let yhs = rects.map(({ y, height }) => y + height)
    return {
        x: minx,
        y: miny,
        width: Math.max(...xws) - minx,
        height: Math.max(...yhs) - miny,
    }
}

interface Word {
    rect: Rect
    text: string
    linebreak: string | false
}

// TODO: Add padding to rects
const padding = 3

function mapBlock(block) {
    const parags: any[] = block.paragraphs

    // Gather the text from this block
    const lines = parags.flatMap((p) => {
        let words: Word[] = p.words.map((w) => {
            // Join the words together
            let word = w.symbols.map(({ text }) => text).join("")
            let lastSym = w.symbols[w.symbols.length - 1]
            let linebreak: string | false =
                lastSym &&
                lastSym.property &&
                lastSym.property.detectedBreak.type
            if (linebreak) console.log(linebreak)

            let boundingBoxes = w.symbols.map(({ boundingBox }) =>
                getOuterBounds(boundingBox)
            )
            let outerBoundingBox = expandOuterBounds(boundingBoxes)

            let stoppers = [",", ".", "!", "?", ":", ";", "-"]
            return {
                rect: outerBoundingBox,
                text: word,
                linebreak:
                    lastSym && stoppers.includes(lastSym.text)
                        ? "PUNCTUATION"
                        : linebreak,
            }
        })
        let lines: { rect: Rect; text: string }[] = []
        let line: Word[] = []
        const pushLine = (line: Word[]) =>
            lines.push({
                rect: expandOuterBounds(line.map((l) => l.rect)),
                text: line.map((t) => t.text).join(" "),
            })
        words.forEach((word) => {
            line.push(word)
            if (
                word.linebreak &&
                ["EOL_SURE_SPACE", "LINE_BREAK", "PUNCTUATION"].includes(
                    word.linebreak
                )
            ) {
                console.log("SURE SPACE")
                pushLine(line)
                line = []
            }
        })
        if (line.length) pushLine(line)

        // Mutate lines
        lines.forEach((line) => {
            // remove >>12321332 (OP), >>1232313 (You)
            line.text = line.text
                .replace(/>>\d+\s*(\(.+\))?/g, "")
                .trim()
                // replace l'll with I'll (google vision error)
                .replace(/l'll|l've|\bl\b/g, (sub) => sub.replace("l", "I"))

            line.text = preSanitize(line.text)
        })

        return lines
    })

    return lines
}

function settingsReducer(state, action) {
    switch (action.type) {
        case "intro":
            return { ...state, intro: action.data }
        case "transition":
            return { ...state, transition: action.data }
        case "outro":
            return { ...state, outro: action.data }
        case "song":
            return { ...state, song: action.data }
        case "voice":
            return { ...state, voice: action.data }
        case "dimensions":
            const [outWidth, outHeight] = action.data
                .split("x")
                .map((a) => parseInt(a))
            return {
                ...state,
                outWidth,
                outHeight,
            }
        case "range":
            return { ...state, range: action.data }
        case "useRange":
            return { ...state, useRange: action.data }
        default:
            console.error("undefined type", action.type)
            return state
    }
}

export default function Edit({ res, images, onFinish }) {
    // res[0][0].fullTextAnnotation.pages[0].blocks
    const [index, setIndex] = useState(0)

    const img = images[index]

    const drawBlocks = useMemo(() => {
        const draw = res.map((obj) => {
            const blocks = obj.fullTextAnnotation
                ? obj.fullTextAnnotation.pages[0].blocks
                : []
            return blocks.flatMap(mapBlock)
        })
        return draw
    }, [res])

    const [pipelines, _setPipelines] = useState(
        images.map(() => ({
            pipeline: [],
            settings: {
                showFirst: false,
            },
        }))
    )
    const setPipeline = (i) => (pipe) =>
        _setPipelines([
            ...pipelines.slice(0, i),
            { ...pipelines[i], pipeline: pipe },
            ...pipelines.slice(i + 1),
        ])
    const setSettings = (i) => (settings) =>
        _setPipelines([
            ...pipelines.slice(0, i),
            { ...pipelines[i], settings: settings },
            ...pipelines.slice(i + 1),
        ])

    const onSubmit = async (e) => {
        e.preventDefault()

        const realPipeline = pipelines.map((p) => ({
            ...p,
            pipeline: p.pipeline.filter((a) => a.type !== "div"),
        }))
        try {
            const rangedPipeline = settings.useRange
                ? realPipeline.slice(0, settings.range)
                : realPipeline
            const rangedImages = settings.useRange
                ? images.slice(0, settings.range)
                : images
            await onFinish(rangedPipeline, rangedImages, settings)
            setStage(2)
        } catch (error) {
            console.error("error")
        }
    }

    const [stage, s] = useState(0)
    const setStage = (n) => {
        console.log("Setting stage ", n)
        s(n)
    }

    const [settings, dispatchSettings] = useReducer(settingsReducer, {
        intro: "",
        outro: "",
        transition: "",
        song: "",
        voice: "",
        outWidth: 1920,
        outHeight: 1080,
        range: pipelines.length,
        useRange: false,
    })

    const btns = (
        <div>
            <button onClick={() => setIndex(index - 1)} disabled={index === 0}>
                Prev
            </button>
            <button onClick={() => setStage(1)}>Finish</button>
            <button
                onClick={() => setIndex(index + 1)}
                disabled={index >= images.length - 1}
            >
                Next
            </button>
        </div>
    )

    const estimatedTime = useMemo(() => estimateTimePretty(pipelines), [
        pipelines,
    ])

    return (
        <div>
            {stage === 2 && (
                <div>
                    <p>
                        Video is rendering. Go to the main page to download the
                        video when the rendering is finished (takes around 10
                        mins). You can also go back to continue on the same
                        video.
                    </p>
                    <button onClick={() => setStage(1)}>
                        Continue with video
                    </button>
                </div>
            )}
            {stage === 1 && (
                <div>
                    <Settings
                        settings={settings}
                        onSubmit={onSubmit}
                        pipeline={pipelines}
                        dispatchSettings={dispatchSettings}
                    />
                    <button onClick={() => setStage(0)}>Back</button>
                </div>
            )}
            {stage === 0 && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        flexDirection: "column",
                        userSelect: "none",
                    }}
                >
                    {btns}

                    <div>
                        <div
                            style={{
                                display: "flex",
                            }}
                        >
                            <div className="card">
                                Number {index + 1} out of {pipelines.length}
                            </div>
                            <div className="card">Time: {estimatedTime}</div>
                            <div className="card">Filetype: {img.type}</div>
                        </div>
                        <EditImage
                            key={img}
                            src={img}
                            blocks={drawBlocks[index]}
                            pipeline={pipelines[index].pipeline}
                            setPipeline={setPipeline(index)}
                            settings={pipelines[index].settings}
                            setSettings={setSettings(index)}
                        />
                    </div>

                    {btns}
                </div>
            )}
        </div>
    )
}
