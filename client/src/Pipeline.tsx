import React, { useMemo } from "react"
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd"
import { Stage } from "./EditImage"

export default function Pipeline({
    setPipeline,
    pipeline,
    highlight,
    removeStage,
}: {
    setPipeline: (pipeline: any[]) => void
    pipeline: Stage[]
    highlight: number | null
    removeStage: (id: number) => void
}) {
    const renderStage = (pipe: Stage[]) => {
        return (
            <div
                className="pipeline-stage"
                style={{
                    background: pipe.some((s) => s.id === highlight)
                        ? "aliceblue"
                        : "rgb(235, 235, 235)",
                    marginBottom: 10,
                    borderRadius: 4,
                    boxShadow: "0 2px 3px #ccc",
                    padding: 8,
                }}
            >
                {pipe.map((stage) => (
                    <div
                        key={stage.id}
                        style={{
                            borderBottom: "1px solid rgb(206, 205, 205)",
                            paddingBottom: 3,
                            marginBottom: 3,
                        }}
                    >
                        {renderInnerStage(stage)}
                    </div>
                ))}
                <div>
                    <div>
                        <button onClick={() => removeStage(pipe[0].id)}>
                            Delete
                        </button>
                        <span style={{ marginRight: 3 }}>
                            ID: {pipe[0].id + 1}
                        </span>
                    </div>
                </div>
            </div>
        )
    }
    const renderInnerStage = (stage: Stage) => {
        switch (stage.type) {
            case "read":
                return (
                    <div>
                        {stage.reads.map((read, readIndex) => (
                            <div style={{ display: "flex" }}>
                                <textarea
                                    // key={readIndex} // TODO: find a better key, perhaps this could lead to bugs?
                                    style={{
                                        width: "100%",
                                        fontSize: 15,
                                        minWidth: 300,
                                    }}
                                    rows={3}
                                    onChange={(e) => {
                                        // Update the correct reads[].text and update the pipeline
                                        const newStage = {
                                            ...stage,
                                            reads: stage.reads.slice(),
                                        }
                                        newStage.reads[readIndex].text =
                                            e.target.value
                                        // Update the stage
                                        updateStage(stage.id, newStage)
                                    }}
                                    value={read.text}
                                ></textarea>
                                <button
                                    style={{
                                        alignSelf: "center",
                                    }}
                                    onClick={(e) => {
                                        const newStage = {
                                            ...stage,
                                            reads: stage.reads.slice(),
                                        }
                                        newStage.reads.splice(readIndex, 1)
                                        updateStage(stage.id, newStage)
                                    }}
                                >
                                    remove
                                </button>
                            </div>
                        ))}
                        {stage.rect.length > 0 && (
                            <div>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={stage.reveal}
                                        onChange={(e) =>
                                            updateStage(stage.id, {
                                                ...stage,
                                                reveal: e.target.checked,
                                            })
                                        }
                                    />
                                    Auto reveal?
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={stage.blockuntil}
                                        onChange={(e) =>
                                            updateStage(stage.id, {
                                                ...stage,
                                                blockuntil: e.target.checked,
                                            })
                                        }
                                    />
                                    Block text
                                </label>
                            </div>
                        )}
                    </div>
                )
            case "pause":
                return (
                    <div>
                        Pause (sec)
                        <input
                            type="number"
                            value={stage.secs}
                            min={0}
                            max={10}
                            step={0.1}
                            onChange={(e) => {
                                updateStage(stage.id, {
                                    ...stage,
                                    secs: Number(e.target.valueAsNumber),
                                })
                            }}
                        />
                        {[0, 0.5, 0.9, 1.75].map((s) => (
                            <button
                                key={s}
                                onClick={() =>
                                    updateStage(stage.id, {
                                        ...stage,
                                        secs: s,
                                    })
                                }
                            >
                                {s.toString()}
                            </button>
                        ))}
                    </div>
                )
            case "reveal":
                return <div>Reveal area</div>
            case "gif":
                return (
                    <div>
                        Play GIF
                        <input
                            type="number"
                            value={stage.times}
                            min={0}
                            max={10}
                            step={1}
                            onChange={(e) => {
                                updateStage(stage.id, {
                                    ...stage,
                                    times: Number(e.target.valueAsNumber),
                                })
                            }}
                        />
                    </div>
                )
            default:
                return <div>Hello</div>
        }
    }

    // Splits the pipeline up in substages, where every type: "div" becomes a separator
    const chunkedPipeline = useMemo(() => {
        let arr: Stage[][] = []
        let work: Stage[] = []
        pipeline.forEach((pipe) => {
            if (pipe.type === "div") {
                arr.push(work)
                work = []
            } else {
                work.push(pipe)
            }
        })
        return arr
    }, [pipeline])

    const onDragEnd = ({ source, destination }) => {
        if (!destination) return

        const toMove = chunkedPipeline[source.index]
        const beMoved = chunkedPipeline[destination.index]
        const fromIndex = pipeline.findIndex((s) => s.id === toMove[0].id)
        const fromLength =
            pipeline.slice(fromIndex).findIndex((a) => a.type === "div") + 1
        let toIndex = pipeline.findIndex((s) => s.id === beMoved[0].id)

        function moveSub(arr, from, len, to) {
            const res = arr.slice()
            // Remove the things to move
            const taken = res.splice(from, len)
            // Insert them at the destination index, taking into account the index may have changed
            res.splice(to, 0, ...taken)

            return res
        }

        const moved = moveSub(pipeline, fromIndex, fromLength, toIndex)

        setPipeline(moved)
    }

    const updateStage = (id, newStage) => {
        const index = pipeline.findIndex((p) => p.id === id)
        setPipeline([
            ...pipeline.slice(0, index),
            newStage,
            ...pipeline.slice(index + 1),
        ])
    }

    return (
        <div>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="pipeline">
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            {chunkedPipeline.map((pipe, index) => (
                                <Draggable
                                    key={pipe[0].id}
                                    draggableId={pipe[0].id.toString()}
                                    index={index}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                        >
                                            {renderStage(pipe)}
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </div>
    )
}
