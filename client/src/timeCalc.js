// Taken from https://github.com/follgad/project-bog
export function estimateComment(splits, words) {
    return (splits * 0.38152203637725923 + words * 0.2767486833003453) * 0.98
}

export function estimateTime(pipelines) {
    const totalTime = pipelines
        .map((pipeline) => {
            const { pause, splits, words } = pipeline.reduce(
                (acc, stage) => {
                    if (stage.type === "read") {
                        acc.words += stage.text.split(/\s+/g).length
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

    const transitions = pipelines.length - 1 * 0.4

    return totalTime + transitions
}

export function estimateTimePretty(pipelines) {
    const duration = estimateTime(pipelines)
    let hrs = ~~(duration / 3600)
    let mins = ~~((duration % 3600) / 60)
    let secs = Math.floor((duration % 60) * 1e1) / 1e1

    return `${hrs > 0 ? hrs + "h" : ""} ${mins}m ${secs}s`.trim()
}
