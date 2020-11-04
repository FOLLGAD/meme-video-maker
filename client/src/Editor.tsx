import React, { useMemo, useReducer, useState } from "react"
import { FileKey } from "./App"
import EditImage, { Pipeline } from "./EditImage"
import { preSanitize } from "./sanitize"
import Settings from "./Settings"
import { estimateTimePretty } from "./timeCalc"

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

const padding = 2

const addPadding = (rect: Rect): Rect => ({
    height: rect.height + padding * 2,
    width: rect.width + padding * 2,
    x: rect.x - padding,
    y: rect.y - padding,
})

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
    prepunctuation: boolean
    punctuation: boolean
}

export interface Line {
    rect: Rect[]
    text: string
    line: number
}

export interface LineBlock {
    blocks: Line[]
    rect: Rect
}

const mapBlock = (block): LineBlock => {
    const parags: any[] = block.paragraphs

    // Gather the text from this block
    const lines = parags.flatMap((p) => {
        let words: Word[] = p.words.map((w) => {
            // Join the words together
            let word = w.symbols
                .map(({ text }) => text)
                .join("")
                .replace(/[\u2018\u2019]/g, "'") // replace smarty-pants quotes to actual normal quotes please
                .replace(/[\u201C\u201D]/g, '"')
            let lastSym = w.symbols[w.symbols.length - 1]
            let firstSym = w.symbols[0]
            let linebreak: string | false =
                lastSym &&
                lastSym.property &&
                lastSym.property.detectedBreak.type

            let boundingBoxes = w.symbols.map(({ boundingBox }) =>
                getOuterBounds(boundingBox)
            )
            let outerBoundingBox = expandOuterBounds(boundingBoxes)

            let stoppers = [",", ".", "!", "?", ":", ";", "-", '"']
            return {
                rect: outerBoundingBox,
                text: word,
                prepunctuation: firstSym && stoppers.includes(firstSym.text),
                punctuation: lastSym && stoppers.includes(lastSym.text),
                linebreak: linebreak,
            }
        })
        let lines: Line[] = []
        let line: Word[] = []
        let currentLine = 0
        const pushLine = (line: Word[]) =>
            lines.push({
                rect: [expandOuterBounds(line.map((l) => l.rect))],
                text: line.map((t) => t.text).join(" "),
                line: currentLine,
            })
        words.forEach((word) => {
            if (word.prepunctuation && line.length > 0) {
                pushLine(line)
                line = []
            }
            line.push(word)
            if (
                word.linebreak &&
                ["EOL_SURE_SPACE", "LINE_BREAK"].includes(word.linebreak)
            ) {
                pushLine(line)
                currentLine++
                line = []
            } else if (word.punctuation) {
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

            line.rect = line.rect.map((r) => addPadding(r))

            line.text = preSanitize(line.text)
        })

        return lines
    })

    return {
        blocks: lines,
        rect: addPadding(getOuterBounds(block.boundingBox)),
    }
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

interface Rec {
    x: number
    y: number
    height: number
    width: number
}

interface Read {
    rect: Rec[]
    text: string
}

export interface ReadStage {
    type: "read"
    joinNext?: boolean
    reads: Read[]
    rect: Rec[]
    reveal: boolean
    blockuntil: boolean
}

export default function Edit({
    res,
    images,
    onFinish,
}: {
    res: any[]
    images: FileKey[]
    onFinish: any
}) {
    // res[0][0].fullTextAnnotation.pages[0].blocks
    const [index, setIndex] = useState(0)

    const img = images[index]

    const drawBlocks = useMemo(() => {
        const draw: LineBlock[][] = res.map((obj): LineBlock[] => {
            if (obj.fullTextAnnotation) {
                let blocks = obj.fullTextAnnotation.pages[0].blocks
                return blocks.map(mapBlock)
            } else {
                return []
            }
        })
        return draw
    }, [res])

    const [pipelines, _setPipelines] = useState<Pipeline[]>(
        images.map(({ key }) => ({
            pipeline: [],
            settings: {
                showFirst: false,
            },
            image: key,
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
            await onFinish(rangedPipeline, settings)
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
                            <div className="card">
                                Filetype: {img.file.type}
                            </div>
                        </div>
                        <EditImage
                            key={img.key}
                            src={img.file}
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
