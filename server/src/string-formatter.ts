let testString = ["Hello, my name", "is Emil lmao"]

let teststring2 = [
    "Tell me why me and my mom telling",
    "to my parents",
    "why I'm not monky",
]
let teststring3 = ["Me and my boys just chilling!"]

let allStrings = [testString, teststring2, teststring3]

let pausers = [
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
    "althought",
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
    "althought",
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
function stringFormatter(input: string[]) {
    return input.map((line) => addDashes(line))
}

// line is a string
function addDashes(line: string) {
    let lineRes = ""
    line.split(" ").forEach((word, i) => {
        if (pausers2.includes(word) && i >= 2) lineRes += "-" + word
        // else if (word == "and" && i >= 2)
        //     lineRes +=
        //         ' <phoneme alphabet="ipa" ph="ænd">thisisnotawort</phoneme>'
        else lineRes += " " + word
    })
    return lineRes.substring(1)
}

console.log("Before:")
console.log(allStrings)
console.log("After:")
console.log(allStrings.map((string) => stringFormatter(string)))
