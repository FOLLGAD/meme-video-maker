import React, { useEffect, useRef, useState } from "react"
import { shortestPause, standardPause } from "./constants"
import Pipeline from "./Pipeline"

// Gets the mouse click position within the canvas
function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return [x, y]
}

let counter = 0

const rectContainsRect = (bigRect, smallRect) =>
    bigRect.x <= smallRect.x &&
    bigRect.y <= smallRect.y &&
    bigRect.x + bigRect.width >= smallRect.x + smallRect.width &&
    bigRect.y + bigRect.height >= smallRect.y + smallRect.height

const isInRect = (rect, x, y) =>
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height

export default function FileImage({
    src,
    blocks,
    settings,
    setSettings,
    pipeline,
    setPipeline,
}: {
    src: File
    blocks: any[]
    settings: any
    setSettings: any
    pipeline: any[]
    setPipeline: any
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
    const [scale, setScale] = useState(1)

    useEffect(() => {
        if (canvasRef.current) {
            setCtx(canvasRef.current.getContext("2d"))
        }
    }, [])

    const drawImage = (src) => {
        const canv = canvasRef.current
        if (!ctx || !canv) return Promise.reject()

        return new Promise((res) => {
            // https://stackoverflow.com/questions/6775767/how-can-i-draw-an-image-from-the-html5-file-api-on-canvas
            const img = new Image()
            img.onload = () => {
                const maxWidth = 900
                const scale = Math.min(1, maxWidth / img.width)
                canv.width = img.width * scale
                canv.height = img.height * scale

                setScale(scale)
                ctx.scale(scale, scale)
                ctx.drawImage(img, 0, 0)
                // 2. Revoke it
                URL.revokeObjectURL(img.src)
                res()
            }
            // 1. Create object url
            img.src = URL.createObjectURL(src)
        })
    }

    const indexIsEnabled = (i) =>
        pipeline.some((s) => s.type === "read" && s._index === i)
    const indexIsAdded = (i) =>
        pipeline.some((s) => s.type === "read" && s.added.includes(i))

    const drawOverlay = () => {
        const canv = canvasRef.current
        if (!ctx || !canv) return

        // Draw reveal blocks
        pipeline.forEach((stage) => {
            if (stage.type === "reveal") {
                const { rect } = stage
                ctx.fillStyle =
                    highlight === stage.id
                        ? "rgba(200, 200, 240, 0.4)"
                        : "rgba(200, 200, 200, 0.3)"
                ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
                const margin = 10
                const size = 50
                ctx.fillStyle = "#000000ee"
                const blackBox = {
                    x: Math.max(
                        0,
                        Math.min(
                            rect.x + rect.width - size - margin,
                            canv.width / scale - size
                        )
                    ),
                    y: Math.max(
                        0,
                        Math.min(rect.y + margin, canv.height / scale - size)
                    ),
                }
                ctx.fillRect(blackBox.x, blackBox.y, size, size)
                ctx.fillStyle = "white"
                ctx.font = "50px sans-serif"
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"
                ctx.fillText(
                    `${stage.id + 1}`,
                    blackBox.x + size / 2,
                    blackBox.y + size / 2 + 10,
                    size
                )
            }
        })

        // Draw reading blocks
        blocks.forEach(({ rect: { x, y, width, height } }, i) => {
            ctx.strokeStyle = indexIsEnabled(i)
                ? "lightgreen"
                : indexIsAdded(i)
                ? "lightblue"
                : "tomato"
            ctx.lineWidth = 2
            ctx.strokeRect(x, y, width, height)
        })
    }

    const [mouseDownAt, setMouseDownAt] = useState<[number, number] | null>(
        null
    )
    const onCanvasMouseDown = (event) => {
        const [mouseX, mouseY] = getCursorPosition(
            canvasRef.current,
            event
        ).map((p) => p / scale)

        setMouseDownAt([mouseX, mouseY])
    }

    const addStage = (stage) => {
        const newStage = { ...stage, id: counter++ }
        if (stage.type === "reveal")
            return setPipeline([
                ...pipeline,
                newStage,
                { type: "pause", id: counter++, secs: standardPause },
                { type: "div" },
            ])
        else if (stage.type === "read")
            return setPipeline([
                ...pipeline,
                newStage,
                { type: "pause", id: counter++, secs: shortestPause },
                { type: "div" },
            ])
        else return setPipeline([...pipeline, newStage, { type: "div" }])
    }

    const addStages = (stages: any[]) =>
        setPipeline([
            ...pipeline,
            ...stages.map((stage) => ({ ...stage, id: counter++ })),
        ])

    const removeStage = (id) => {
        const index = pipeline.findIndex((p) => p.id === id)
        const len = pipeline.slice(index).findIndex((t) => t.type === "div")
        pipeline.splice(index, len + 1)
        setPipeline([...pipeline])
    }

    const updateStage = (index, newStage) => {
        setPipeline([
            ...pipeline.slice(0, index),
            newStage,
            ...pipeline.slice(index + 1),
        ])
    }

    const [highlight, setHighlight] = useState<number | null>(null)

    const [shiftDown, setShift] = useState(false)

    const keyHandler = (e) => {
        if (e.key === "Shift") setShift(e.type === "keydown")
    }

    document.addEventListener("keydown", keyHandler)
    document.addEventListener("keyup", keyHandler)

    const onCanvasMouseUp = (event) => {
        const canv = canvasRef.current
        if (!canv) return

        const [mouseX, mouseY] = getCursorPosition(
            canvasRef.current,
            event
        ).map((p) => p / scale)

        if (!mouseDownAt) return

        const [fromX, fromY] = mouseDownAt
        setHighlight(null)

        const rect = {
            x: Math.min(mouseX, fromX),
            y: Math.min(mouseY, fromY),
            width: Math.abs(mouseX - fromX),
            height: Math.abs(mouseY - fromY),
        }

        if (
            rect.x + rect.width < 0 ||
            rect.x > canv.width / scale ||
            rect.y + rect.height < 0 ||
            rect.y > canv.height / scale
        )
            return

        if (Math.abs(mouseX - fromX) > 10 && Math.abs(mouseY - fromY) > 10) {
            // Add a reveal rect
            let arr: { type: string; [key: string]: any }[] = []

            arr.push({ type: "reveal", rect })
            arr.push({ type: "div" })

            if (shiftDown) {
                const rs = blocks
                    .map((a, i) => [a, i])
                    .filter(([r, _]) => rectContainsRect(rect, r.rect))
                    .filter(([_, i]) => !indexIsEnabled(i))

                rs.forEach(([block, i]) => {
                    arr.push(
                        {
                            type: "read",
                            _index: i,
                            text: block.text.toLowerCase(),
                            rect: [block.rect],
                            blockuntil: false,
                            reveal: false,
                            added: [],
                        },
                        { type: "pause", secs: 0.5 },
                        { type: "div" }
                    )
                })
            } else {
                arr.push({ type: "pause", secs: 0.0 })
                arr.push({ type: "div" })
            }

            return addStages(arr)
        }

        const found = blocks.findIndex(({ rect }) =>
            isInRect(rect, mouseX, mouseY)
        )

        if (found !== -1) {
            if (indexIsEnabled(found)) {
                removeStage(pipeline.find((s) => s._index === found).id)
            } else if (shiftDown) {
                // If shift is down, look for the last TTS and append the clicked text to it.
                const revInd = pipeline
                    .slice()
                    .reverse()
                    .findIndex((s) => s.type === "read")

                const ind = pipeline.length - 1 - revInd
                if (revInd !== -1 && !pipeline[ind].added.includes(found)) {
                    const newText =
                        pipeline[ind].text +
                        " " +
                        blocks[found].text.toLowerCase()
                    updateStage(ind, {
                        ...pipeline[ind],
                        text: newText,
                        rect: [...pipeline[ind].rect, blocks[found].rect],
                        added: [...pipeline[ind].added, found],
                    })
                }
            } else {
                addStage({
                    type: "read",
                    _index: found,
                    text: blocks[found].text.toLowerCase(),
                    rect: [blocks[found].rect],
                    blockuntil: false,
                    reveal: true,
                    added: [],
                })
            }
        }

        const rectIndex = pipeline.findIndex(
            (val) => val.rect && isInRect(val.rect, mouseX, mouseY)
        )
        if (rectIndex !== -1) {
            setHighlight(rectIndex)
        }
    }

    useEffect(() => {
        if (canvasRef.current && ctx)
            drawImage(src).then(() => {
                drawOverlay()
            })
    }, [blocks, src, ctx, pipeline, highlight, drawImage, drawOverlay])

    const divRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const divCur = divRef.current
        if (!divCur) return

        const stop = (e) => {
            e.stopPropagation()
            setMouseDownAt(null)
        }
        divCur.addEventListener("mousedown", stop)
        divCur.addEventListener("mouseup", stop)
        return () => {
            divCur.removeEventListener("mousedown", stop)
            divCur.removeEventListener("mouseup", stop)
        }
    }, [divRef])

    useEffect(() => {
        document.addEventListener("mousedown", onCanvasMouseDown)
        document.addEventListener("mouseup", onCanvasMouseUp)
        return () => {
            document.removeEventListener("mousedown", onCanvasMouseDown)
            document.removeEventListener("mouseup", onCanvasMouseUp)
        }
    }, [mouseDownAt, onCanvasMouseDown, onCanvasMouseUp, pipeline, scale])

    const addStageButtons = (
        <div style={{ marginBottom: 5 }}>
            <button
                onClick={() => addStage({ type: "pause", secs: standardPause })}
            >
                Pause
            </button>
            <button
                onClick={() =>
                    addStage({
                        type: "reveal",
                        rect: {
                            x: 0,
                            y: 0,
                            width: canvasRef.current
                                ? canvasRef.current.width / scale
                                : 0,
                            height: canvasRef.current
                                ? canvasRef.current.height / scale
                                : 0,
                        },
                    })
                }
            >
                Reveal full img
            </button>
            <button
                onClick={() =>
                    addStage({
                        type: "read",
                        text: "",
                        blockuntil: false,
                        reveal: false,
                        _index: null,
                        added: [],
                        rect: [],
                    })
                }
                title="Manually add a tts voice line"
            >
                Custom TTS
            </button>
            {!["image/png", "image/jpeg"].includes(src.type) && (
                <button onClick={() => addStage({ type: "gif", times: 1 })}>
                    Play GIF
                </button>
            )}
        </div>
    )

    return (
        <div style={{ display: "flex", userSelect: "none" }}>
            <div>
                <canvas ref={canvasRef} />
            </div>
            <div style={{ paddingRight: 5, paddingLeft: 5 }}></div>
            <div className="card">
                <div>
                    <label>
                        <input
                            title="Show this meme before the intro of the video"
                            type="checkbox"
                            checked={settings.showFirst}
                            onChange={({ target }) =>
                                setSettings({
                                    ...settings,
                                    showFirst: target.checked,
                                })
                            }
                        />
                        Show before?
                    </label>
                    <hr />
                </div>
                {addStageButtons}
                <div ref={divRef}>
                    <Pipeline
                        pipeline={pipeline}
                        setPipeline={setPipeline}
                        highlight={highlight}
                        removeStage={removeStage}
                    />
                </div>
                {addStageButtons}
            </div>
        </div>
    )
}
