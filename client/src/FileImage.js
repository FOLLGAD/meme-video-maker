import React, { useEffect, useRef, useState } from 'react';

// Gets the mouse click position within the canvas
function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return [x, y]
}

export default function FileImage({ src, blocks, setAlwaysShow, alwaysShow, enabledBlocks, setEnabledBlocks, textBlocks, setTextBlocks }) {
    const canvasRef = useRef(null)
    const [ctx, setCtx] = useState(null)
    const [scale, setScale] = useState(1)
    const [selectAlwaysShow, setAlwShow] = useState(false)

    useEffect(() => {
        setCtx(canvasRef.current.getContext("2d"))
    }, [])

    const drawImage = src => {
        return new Promise(res => {
            // https://stackoverflow.com/questions/6775767/how-can-i-draw-an-image-from-the-html5-file-api-on-canvas
            const img = new Image()
            img.onload = () => {
                const canv = canvasRef.current
                const maxWidth = 1200
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

    const drawOverlay = () => {
        alwaysShow.forEach(({ x, y, width, height }) => {
            ctx.fillStyle = "rgba(50, 180, 70, 0.3)"
            ctx.fillRect(x, y, width, height)
        })

        // Draw the blocks
        blocks.forEach(({ x, y, width, height }, i) => {
            const enabled = enabledBlocks[i] !== false
            ctx.strokeStyle = enabled ? "aliceblue" : "tomato"
            ctx.lineWidth = 2
            ctx.strokeRect(x, y, width, height)
            if (enabled) {
                ctx.fillStyle = "#000"
                ctx.textAlign = "right"
                ctx.fillText(enabledBlocks[i], x + width, y + height)
            }
        })
    }

    const [mouseDownAt, setMouseDownAt] = useState(null)
    const onCanvasMouse = event => {
        if (!selectAlwaysShow) return

        const [mouseX, mouseY] = getCursorPosition(canvasRef.current, event)
            .map(d => d / scale)

        if (event.type === "mousedown") {
            setMouseDownAt([mouseX, mouseY])
        } else if (event.type === "mouseup") {
            if (!mouseDownAt) return;

            const [lastX, lastY] = mouseDownAt
            const rec = {
                x: Math.min(mouseX, lastX),
                y: Math.min(mouseY, lastY),
                width: Math.abs(mouseX - lastX),
                height: Math.abs(mouseY - lastY),
            }
            setMouseDownAt(null)

            if (rec.height < 5 || rec.width < 5) return;

            setAlwaysShow([...alwaysShow, rec])
        } else {
            console.error("unhandled event", event.type)
        }
    }

    const onCanvasClick = event => {
        event.preventDefault()
        const [mouseX, mouseY] = getCursorPosition(canvasRef.current, event)
            .map(p => p / scale)

        const index = blocks.findIndex(({ x, y, width, height }) => {
            const intersects = mouseX >= x && mouseX <= x + width
                && mouseY >= y && mouseY <= y + height

            return intersects
        })

        if (index !== -1) {
            const alreadyEnabled = enabledBlocks[index] !== false
            if (alreadyEnabled) {
                const newOne = enabledBlocks.map((v, i) => i === index ? false : v)
                setEnabledBlocks(newOne)
            } else {
                const lastMax = Math.max(...enabledBlocks)
                const newOne = enabledBlocks.map((v, i) => i === index ? lastMax + 1 : v)
                setEnabledBlocks(newOne)
            }
        }
    }

    const isAllEnabled = () => enabledBlocks.every(v => v !== false)

    const enableAll = () => {
        const enab = enabledBlocks.map((_, i) => i)
        setEnabledBlocks(enab)
    }
    const disableAll = () => {
        const enab = enabledBlocks.map(() => false)
        setEnabledBlocks(enab)
    }

    useEffect(() => {
        const func = e => {
            if (e.code === "KeyA") {
                isAllEnabled() ? disableAll() : enableAll()
            }
        }
        document.addEventListener("keypress", func)

        // Cleanup
        return () => document.removeEventListener("keypress", func)
    })

    useEffect(() => {
        if (canvasRef.current && ctx)
            drawImage(src)
                .then(() => {
                    drawOverlay()
                })

    }, [enabledBlocks, blocks, src, ctx, alwaysShow])

    const updateText = (e, i) => {
        e.preventDefault()
        textBlocks[i] = e.target.value
        setTextBlocks(textBlocks)
    }

    return (
        <div style={{ display: "flex" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
                {selectAlwaysShow
                    ? <button onClick={() => setAlwShow(false)}>Select comments</button>
                    : <button onClick={() => setAlwShow(true)}>Select always show</button>
                }
                {isAllEnabled() ?
                    <button onClick={disableAll}>Disable all (A)</button> :
                    <button onClick={enableAll}>Enable all (A)</button>
                }
            </div>
            <div>
                <canvas onClick={onCanvasClick} onMouseDown={onCanvasMouse} onMouseUp={onCanvasMouse} ref={canvasRef} />
            </div>
            <div>
                {textBlocks
                    .map((e, i) => [e, i])
                    .filter((_, i) => enabledBlocks[i] !== false)
                    .map(([t, i]) => (
                        <div key={i}>
                            <textarea cols="30" rows="8" onChange={(e) => updateText(e, i)} value={t} />
                        </div>
                    ))}
            </div>
        </div>
    )
}
