import React from "react"
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd"

function arrayMove(arr1, old_index, new_index) {
    let arr = arr1.slice()
    if (new_index >= arr.length) {
        var k = new_index - arr.length + 1
        while (k--) {
            arr.push(undefined)
        }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0])
    return arr
}

export default function ({ setPipeline, pipeline, highlight }) {
    const renderStage = (stage, i) => {
        return (
            <div
                className="pipeline-stage"
                style={{
                    background:
                        highlight === i ? "aliceblue" : "rgb(235, 235, 235)",
                    marginBottom: 10,
                    borderRadius: 4,
                    boxShadow: "0 2px 3px #ccc",
                    padding: 8,
                }}
            >
                {renderInnerStage(stage, i)}
                <div>
                    <span style={{ marginRight: 3 }}>{i + 1}</span>
                    <button onClick={() => removeStage(i)}>Delete</button>
                </div>
            </div>
        )
    }
    const renderInnerStage = (stage, i) => {
        switch (stage.type) {
            case "read":
                return (
                    <div>
                        <textarea
                            style={{ width: "100%" }}
                            rows="3"
                            onChange={(e) =>
                                updateStage(i, {
                                    ...stage,
                                    text: e.target.value,
                                })
                            }
                            value={stage.text}
                        ></textarea>
                        {stage.rect.length > 0 && (
                            <div>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={stage.reveal}
                                        onChange={(e) =>
                                            updateStage(i, {
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
                                            updateStage(i, {
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
                                updateStage(i, {
                                    ...stage,
                                    secs: Number(e.target.valueAsNumber),
                                })
                            }}
                        />
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
                                updateStage(i, {
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

    const onDragEnd = ({ source, destination }) => {
        if (!destination) return

        moveStage(source.index, destination.index)
    }

    const removeStage = (index) => {
        pipeline.splice(index, 1)
        setPipeline([...pipeline])
    }
    const moveStage = (origIndex, toIndex) => {
        setPipeline(arrayMove(pipeline, origIndex, toIndex))
    }
    const updateStage = (index, newStage) => {
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
                            {pipeline.map((pipe, index) => (
                                <Draggable
                                    key={pipe.id}
                                    draggableId={pipe.id.toString()}
                                    index={index}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                        >
                                            {renderStage(pipe, index)}
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
