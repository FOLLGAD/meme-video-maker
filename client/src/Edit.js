import React, { useState, useEffect, useMemo } from 'react';
import FileImage from './FileImage';
import apiFetch from './apiFetch';

function mapBlock(block) {
    const vert = block.boundingBox.vertices
    const { x, y } = vert[0]
    const width = vert[2].x - vert[0].x
    const height = vert[2].y - vert[0].y

    // Gather the text from this block
    const text = block.paragraphs.map(p => {
        let parag = p.words.map(w => {
            return w.symbols.map(({ text, property }) => {
                const dBreak = property && property.detectedBreak

                if (dBreak && (dBreak.type === "LINE_BREAK" || dBreak.type === "EOL_SURE_SPACE"))
                    text += "\n"

                return text
            }).join("")
        }).join(" ")
        // remove >>12321332 (OP), >>1232313 (You)
        parag = parag.replace(/>>\d+([^\w\n]*.+)?/g, "").trim()
        return parag
    }).join("\n")

    return { text, x: x - padding, y: y - padding, width: width + padding * 2, height: height + padding * 2 }
}

const padding = 3

export default function Edit({ res, images, onFinish }) {
    const [index, setIndex] = useState(0)
    const [alwaysShow, setAlwaysShow] = useState([])

    const nextIndex = () => setIndex(Math.min(index + 1, images.length - 1))
    const prevIndex = () => setIndex(Math.max(index - 1, 0))

    const [enabledBlocks, setEnabledBlocks] = useState([])
    const [textBlocks, setTextBlocks] = useState([])

    const thisTextBlocks = textBlocks[index]
    const setThisTextBlocks = blocks =>
        setTextBlocks(textBlocks.map((v, i) => {
            return i === index ?
                blocks :
                v.slice()
        }))

    const thisEnabledBlocks = enabledBlocks[index]
    const setThisEnabledBlocks = blocks =>
        setEnabledBlocks(enabledBlocks.map((v, i) => {
            return i === index ?
                blocks :
                v.slice()
        }))

    const thisAlwaysShow = alwaysShow[index]
    const setThisAlwaysShow = blocks =>
        setAlwaysShow(alwaysShow.map((v, i) => {
            return i === index ?
                blocks :
                v.slice()
        }))

    /**
     * alwaysShow = Rect[][]
     * enabledBlocks = Rect[][]
     */

    const img = images[index]

    const drawBlocks = useMemo(() => {
        const draw = res.map(obj => {
            return obj[0].fullTextAnnotation.pages[0].blocks.map(mapBlock)
        })
        // set all to false
        setEnabledBlocks(draw.map(a => a.map(() => false)))
        setAlwaysShow(draw.map(() => []))
        setTextBlocks(draw.map(a => a.map(b => b.text)))
        return draw
    }, [res])

    useEffect(() => {
        const func = ({ keyCode, repeat }) => {
            // if (repeat) return

            switch (keyCode) {
                case 37:
                    prevIndex()
                    break
                case 39:
                    nextIndex()
                    break
            }
        }
        document.addEventListener("keydown", func)

        // Cleanup
        return () => document.removeEventListener("keydown", func)
    }, [])

    const submit = () => {
        const blocks = drawBlocks.map((b, i) => {
            let enabled = enabledBlocks[i]
            let texts = textBlocks[i]
            let enabledDraws = b
                .map((d, i) => ({
                    text: texts[i],
                    block: d,
                    // priority: enabled[i],
                }))
                .filter((_, i) => enabled[i] !== false)

            // Sort by priority
            // enabledDraws.sort((a, b) => a.priority - b.priority)

            return {
                alwaysShow: alwaysShow[i],
                blocks: enabledDraws,
            }
        })
        onFinish(blocks, images)
    }

    const [showingSettings, setShowSettings] = useState(false)

    const [files, setFiles] = useState(null)

    useEffect(() => {
        apiFetch('/files')
            .then(d => d.json())
            .then((files) => {
                setFiles(files)
            })
    }, [])

    return (
        <div>
            {showingSettings ?
                <div>
                    <select>
                        {files.videos.map(file =>
                            <option value={file}>{file}</option>
                        )}
                    </select>
                </div>
                :
                <div>
                    <FileImage
                        key={img}
                        src={img}
                        blocks={drawBlocks[index]}
                        enabledBlocks={thisEnabledBlocks}
                        textBlocks={thisTextBlocks}
                        setTextBlocks={setThisTextBlocks}
                        setEnabledBlocks={setThisEnabledBlocks}
                        alwaysShow={thisAlwaysShow}
                        setAlwaysShow={setThisAlwaysShow}
                    />

                    <button onClick={prevIndex} disabled={index === 0}>Back (l. arrow)</button>
                    <button onClick={() => setShowSettings(true)}>Next</button>
                    <button onClick={nextIndex} disabled={index >= images.length - 1}>Forw (r. arrow)</button>
                </div>
            }
        </div >
    )
}
