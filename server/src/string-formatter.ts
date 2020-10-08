let pausers = [
    "and",
    "why",
    "or",
    "but",
    "so",
    "after",
    "before",
    "even if",
    "if",
    "just as",
    "provided",
    "since",
    "that",
    "until",
    "whenever",
    "whereas",
    "wherever",
    "although",
    "as if",
    "because",
    "even though",
    "if only",
    "if then",
    "lest",
    "when",
    "provided",
    "rather than",
    "so that",
]

let pausers2 = [
    "and",
    "why",
    "or",
    "but",
    "so",
    "after",
    "before",
    "even",
    "if",
    "just",
    "provided",
    "since",
    "that",
    "until",
    "whenever",
    "whereas",
    "wherever",
    "although",
    "as",
    "because",
    "even though",
    "only",
    "then",
    "lest",
    "when",
    "provided",
    "than",
    "rather",
]

// input is array of strings
export function stringFormatter(input: string[]) {
    return input.map((line) => addDashesOrSpaces(line))
}

// line is a string
function addDashesOrSpaces(line: string) {
    let lineRes = ""
    line.split(" ").forEach((word, i) => {
        if (pausers2.includes(word) && i >= 2) lineRes += "-" + word
        else lineRes += " " + word
    })
    return lineRes.substring(1)
}
