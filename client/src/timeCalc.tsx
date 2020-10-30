import { Pipeline } from "./EditImage"

// Taken from https://github.com/follgad/project-bog
export function estimateComment(splits: number, words: number) {
    return (splits * 0.38152203637725923 + words * 0.2767486833003453) * 0.98
}

export function estimateTime(pipelines: Pipeline[]) {
    const pipes = pipelines.map((p) => p.pipeline).filter((p) => p.length > 0)
    const totalTime = pipes
        .map((pipeline) => {
            const { pause, splits, words } = pipeline.reduce(
                (acc, stage) => {
                    if (stage.type === "read") {
                        acc.words += stage.reads
                            .map((r) => r.text.split(/\s+/g).length)
                            .reduce((acc, cur) => acc + cur, 0)
                        acc.splits += 1
                    } else if (stage.type === "pause") {
                        acc.pause += stage.secs
                    }
                    return acc
                },
                {
                    words: 0,
                    splits: 0,
                    pause: 0,
                }
            )
            return pause + estimateComment(splits, words)
        })
        .reduce((acc, val) => acc + val, 0)

    const transitions = Math.max(pipes.length - 1, 0) * 0.4

    return totalTime + transitions
}

export function estimateTimePretty(pipelines: Pipeline[]) {
    const duration = estimateTime(pipelines)
    let hrs = ~~(duration / 3600)
    let mins = ~~((duration % 3600) / 60)
    let secs = Math.floor((duration % 60) * 1e1) / 1e1

    return `${hrs > 0 ? hrs + "h" : ""} ${mins}m ${secs}s`.trim()
}
