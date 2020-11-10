let pausers = [
    "even if",
    "just as",
    "as if",
    "even though",
    "if only",
    "if then",
    "rather than",
    "so that",
    "because",
    "provided",
    "since",
    "that",
    "until",
    "whenever",
    "whereas",
    "wherever",
    "although",
    "before",
    "lest",
    "when",
    "and",
    "why",
    "or",
    "but",
    "so",
    "after",
    "if",
    "to",
    "project",
    "will",
    "won't",
    "turn",
    "like"
]

// /\b\s?(even if|just as|...|after|if)\b/gi
let regex = new RegExp(`\\b\\s?(${pausers.join("|")})\\b`, "gi")

// line is a string
function addDashesOrSpaces(line: string) {
    return line.replace(regex, "-$1")
}

// input is array of strings
export function stringFormatter(input: string[]) {
    return input.map((line) => addDashesOrSpaces(line))
}
