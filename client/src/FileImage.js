import React, { useEffect, useRef, useState, useCallback } from 'react';

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

    const drawOverlay = () => {
        alwaysShow.forEach(({ x, y, width, height }) => {
            ctx.fillStyle = "rgba(50, 180, 70, 0.3)"
            ctx.fillRect(x, y, width, height)
        })

        // Draw the blocks
        blocks.forEach(({ x, y, width, height }, i) => {
            const enabled = enabledBlocks[i] !== false
            ctx.strokeStyle = enabled ? "lightgreen" : "tomato"
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
    const onCanvasMouseDown = event => {
        const [mouseX, mouseY] = getCursorPosition(canvasRef.current, event)
            .map(p => p / scale)

        setMouseDownAt([mouseX, mouseY])
    }
    const onCanvasMouseUp = event => {
        const [mouseX, mouseY] = getCursorPosition(canvasRef.current, event)
            .map(p => p / scale)

        if (selectAlwaysShow && mouseDownAt) {
            const [lastX, lastY] = mouseDownAt
            const rec = {
                x: Math.min(mouseX, lastX),
                y: Math.min(mouseY, lastY),
                width: Math.abs(mouseX - lastX),
                height: Math.abs(mouseY - lastY),
            }
            setMouseDownAt(null)

            if (rec.height > 5 && rec.width > 5) {
                setAlwaysShow([...alwaysShow, rec])
                return
            } else {
                // Try to delete
                const ind = alwaysShow.findIndex(a => a.x < mouseX && a.y < mouseY && a.x + a.width > mouseX && a.y + a.height > mouseY)
                if (ind !== -1) {
                    setAlwaysShow([...alwaysShow.slice(0, ind), ...alwaysShow.slice(ind + 1)])
                    return
                }
            }
        }

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

    const isAllEnabled = useCallback(() => enabledBlocks.every(v => v !== false), [enabledBlocks])

    const enableAll = useCallback(() => {
        const enab = enabledBlocks.map((_, i) => i)
        setEnabledBlocks(enab)
    }, [enabledBlocks, setEnabledBlocks])

    const disableAll = useCallback(() => {
        const enab = enabledBlocks.map(() => false)
        setEnabledBlocks(enab)
    }, [enabledBlocks, setEnabledBlocks])

    // useEffect(() => {
    //     const func = e => {
    //         if (e.code === "KeyA") {
    //             isAllEnabled() ? disableAll() : enableAll()
    //         }
    //     }
    //     document.addEventListener("keyup", func)

    //     // Cleanup
    //     return () => document.removeEventListener("keyup", func)
    // }, [isAllEnabled, disableAll, enableAll])

    useEffect(() => {
        if (canvasRef.current && ctx)
            drawImage(src)
                .then(() => {
                    drawOverlay()
                })

    }, [enabledBlocks, blocks, src, ctx, alwaysShow])

    const updateText = i => e => {
        e.preventDefault()

        textBlocks[i] = e.target.value
        setTextBlocks(textBlocks)
    }

    const stopProp = e => e.stopPropagation()

    return (
        <div style={{ display: "flex" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
                {selectAlwaysShow
                    ? <button onClick={() => setAlwShow(false)}>Select comments</button>
                    : <button onClick={() => setAlwShow(true)}>Select always show</button>
                }
                {isAllEnabled() ?
                    <button onClick={disableAll}>Disable all</button> :
                    <button onClick={enableAll}>Enable all</button>
                }
            </div>
            <div>
                <canvas onMouseDown={onCanvasMouseDown} onMouseUp={onCanvasMouseUp} ref={canvasRef} />
            </div>
            <div style={{ width: 400 }}>
                {textBlocks
                    .map((e, i) => [e, i])
                    .filter((_, i) => enabledBlocks[i] !== false)
                    .map(([t, i]) => (
                        <div key={i}>
                            <textarea style={{ width: "100%" }} rows="5" onKeyUp={stopProp} onKeyDown={stopProp} onChange={updateText(i)} value={t} />
                        </div>
                    ))}
            </div>
        </div>
    )
}
