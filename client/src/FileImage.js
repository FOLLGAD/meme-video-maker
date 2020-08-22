import React, { useEffect, useRef, useState } from "react"
import Pipeline from "./Pipeline"
import { standardPause } from "./constants"

// Gets the mouse click position within the canvas
function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return [x, y]
}

let counter = 0

const isInRect = (rect, x, y) =>
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height

export default function FileImage({ src, blocks, pipeline, setPipeline }) {
    const canvasRef = useRef(null)
    const [ctx, setCtx] = useState(null)
    const [scale, setScale] = useState(1)

    useEffect(() => {
        setCtx(canvasRef.current.getContext("2d"))
    }, [])

    const drawImage = (src) => {
        return new Promise((res) => {
            // https://stackoverflow.com/questions/6775767/how-can-i-draw-an-image-from-the-html5-file-api-on-canvas
            const img = new Image()
            img.onload = () => {
                const canv = canvasRef.current
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

    const drawOverlay = () => {
        // Draw reveal blocks
        pipeline.forEach((stage, i) => {
            if (stage.type === "reveal") {
                const { rect } = stage
                ctx.fillStyle =
                    highlight === i
                        ? "rgba(200, 200, 240, 0.4)"
                        : "rgba(200, 200, 200, 0.3)"
                ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
                const margin = 10
                const size = 50
                ctx.fillStyle = "#000000ee"
                ctx.fillRect(
                    rect.x + rect.width - size - margin,
                    rect.y + margin,
                    size,
                    size
                )
                ctx.fillStyle = "white"
                ctx.font = "50px sans-serif"
                ctx.textAlign = "center"
                ctx.textBaseline = "middle"
                ctx.fillText(
                    `${i + 1}`,
                    rect.x + rect.width - size / 2 - margin,
                    rect.y + margin + size / 2 + 10,
                    size
                )
            }
        })

        // Draw reading blocks
        blocks.forEach(({ rect: { x, y, width, height } }, i) => {
            const enabled = indexIsEnabled(i)
            ctx.strokeStyle = enabled ? "lightgreen" : "tomato"
            ctx.lineWidth = 2
            ctx.strokeRect(x, y, width, height)
        })
    }

    const [mouseDownAt, setMouseDownAt] = useState(null)
    const onCanvasMouseDown = (event) => {
        const [mouseX, mouseY] = getCursorPosition(
            canvasRef.current,
            event
        ).map((p) => p / scale)

        setMouseDownAt([mouseX, mouseY])
    }

    const addStage = (stage) =>
        setPipeline([...pipeline, { ...stage, id: counter++ }])

    const removeStage = (index) => {
        pipeline.splice(index, 1)
        setPipeline([...pipeline])
    }

    const updateStage = (index, newStage) => {
        setPipeline([
            ...pipeline.slice(0, index),
            newStage,
            ...pipeline.slice(index + 1),
        ])
    }

    const [highlight, setHighlight] = useState(null)

    const [shiftDown, setShift] = useState(false)

    const keyHandler = (e) => {
        if (e.key === "Shift") setShift(e.type === "keydown")
    }

    document.addEventListener("keydown", keyHandler)
    document.addEventListener("keyup", keyHandler)

    const onCanvasMouseUp = (event) => {
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
            rect.x > canvasRef.current.width / scale ||
            rect.y + rect.height < 0 ||
            rect.y > canvasRef.current.height / scale
        )
            return

        if (Math.abs(mouseX - fromX) > 10 && Math.abs(mouseY - fromY) > 10) {
            return addStage({ type: "reveal", rect })
        }

        const found = blocks.findIndex(({ rect }) =>
            isInRect(rect, mouseX, mouseY)
        )

        if (found !== -1) {
            if (indexIsEnabled(found)) {
                setPipeline(
                    pipeline.filter(
                        (s) => s.type !== "read" || s._index !== found
                    )
                )
            } else if (shiftDown) {
                // If shift is down, look for the last TTS and append the clicked text to it.
                const revInd = pipeline
                    .slice()
                    .reverse()
                    .findIndex((s) => s.type === "read")

                if (revInd !== -1) {
                    const ind = pipeline.length - 1 - revInd
                    const newText =
                        pipeline[ind].text +
                        " " +
                        blocks[found].text.toLowerCase()
                    updateStage(ind, {
                        ...pipeline[ind],
                        text: newText,
                        rect: [...pipeline[ind].rect, blocks[found].rect],
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
    }, [blocks, src, ctx, pipeline, highlight])

    const divRef = useRef()

    useEffect(() => {
        const stop = (e) => {
            e.stopPropagation()
            setMouseDownAt(null)
        }
        divRef.current.addEventListener("mousedown", stop)
        divRef.current.addEventListener("mouseup", stop)
        return () => {
            divRef.current.removeEventListener("mousedown", stop)
            divRef.current.removeEventListener("mouseup", stop)
        }
    }, [divRef])

    useEffect(() => {
        document.addEventListener("mousedown", onCanvasMouseDown)
        document.addEventListener("mouseup", onCanvasMouseUp)
        return () => {
            document.removeEventListener("mousedown", onCanvasMouseDown)
            document.removeEventListener("mouseup", onCanvasMouseUp)
        }
    }, [mouseDownAt, pipeline, scale])

    return (
        <div style={{ display: "flex" }}>
            <div>
                <canvas ref={canvasRef} />
            </div>
            <div style={{ paddingRight: 5, paddingLeft: 5 }}></div>
            <div>
                <div>
                    <button
                        onClick={() =>
                            addStage({ type: "pause", secs: standardPause })
                        }
                    >
                        Add pause
                    </button>
                    <button onClick={() => addStage({ type: "gif", times: 1 })}>
                        Play GIF
                    </button>
                    <button
                        onClick={() =>
                            addStage({
                                type: "reveal",
                                rect: {
                                    x: 0,
                                    y: 0,
                                    width: canvasRef.current.width / scale,
                                    height: canvasRef.current.height / scale,
                                },
                            })
                        }
                    >
                        Reaveal full
                    </button>
                </div>
                <div ref={divRef}>
                    <Pipeline
                        pipeline={pipeline}
                        setPipeline={setPipeline}
                        highlight={highlight}
                    />
                </div>
            </div>
        </div>
    )
}
