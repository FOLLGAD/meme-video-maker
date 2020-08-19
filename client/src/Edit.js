import React, { useCallback, useMemo, useReducer, useState } from "react"
import FileImage from "./FileImage"
import Settings from "./Settings"

function mapBlock(block) {
    const vert = block.boundingBox.vertices
    const { x, y } = vert[0]
    const width = vert[2].x - vert[0].x
    const height = vert[2].y - vert[0].y

    // Gather the text from this block
    const text = block.paragraphs
        .map((p) => {
            let parag = p.words
                .map((w) => {
                    return w.symbols.map(({ text }) => text).join("")
                })
                .join(" ")
            // remove >>12321332 (OP), >>1232313 (You)
            parag = parag.replace(/>>\d+\s*(\(.+\))?/g, "").trim()
            return parag
        })
        .join("\n")
        .split("\n")
        .map((d) => d.trim())
        .join("\n")

    return {
        text,
        x: x - padding,
        y: y - padding,
        width: width + padding * 2,
        height: height + padding * 2,
    }
}

const padding = 3

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
        default:
            console.error("undefined type", action.type)
    }
}

export default function Edit({ res, images, onFinish }) {
    // res[0][0].fullTextAnnotation.pages[0].blocks
    const [index, setIndex] = useState(0)
    const [alwaysShow, setAlwaysShow] = useState([])

    const [enabledBlocks, setEnabledBlocks] = useState([])
    const [textBlocks, setTextBlocks] = useState([])

    const img = images[index]

    const drawBlocks = useMemo(() => {
        const draw = res.map((obj) => {
            const blocks = obj[0].fullTextAnnotation
                ? obj[0].fullTextAnnotation.pages[0].blocks
                : []
            return blocks.map(mapBlock)
        })
        // set all to false
        setEnabledBlocks(draw.map((a) => a.map(() => false)))
        setAlwaysShow(draw.map(() => []))
        setTextBlocks(draw.map((a) => a.map((b) => b.text)))
        return draw
    }, [res])

    const [pipeline, _setPipeline] = useState(images.map(() => []))
    const setPipeline = (i) => (pipe) =>
        _setPipeline([...pipeline.slice(0, i), pipe, ...pipeline.slice(i + 1)])

    const onSubmit = async (e) => {
        e.preventDefault()
        const blocks = drawBlocks.map((b, i) => {
            // TODO: send data
        })

        try {
            await onFinish(blocks, images, settings)
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

    return (
        <div>
            {stage === 2 && (
                <div>
                    <p>
                        Video is rendering. Go to the main page to download the
                        video when the rendering is finished (takes around 10
                        mins)
                    </p>
                    <button onClick={() => setStage(1)}>Back</button>
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
                    }}
                >
                    {btns}

                    <div>
                        <FileImage
                            key={img}
                            src={img}
                            blocks={drawBlocks[index]}
                            pipeline={pipeline[index]}
                            setPipeline={setPipeline(index)}
                        />
                    </div>

                    {btns}
                </div>
            )}
        </div>
    )
}
