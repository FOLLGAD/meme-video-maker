let testString = ["Hello, my name", "is Emil lmao"]

let teststring2 = [
    "Tell me why me and my mom telling",
    "to my parents",
    "why I'm not monky",
]
let teststring3 = ["Me and my boys just chilling!"]

let allStrings = [testString, teststring2, teststring3]

// input is array of strings
function stringFormatter(input: string[]) {
    return input.map((line) => addDashes(line))
}

// line is a string
function addDashes(line: string) {
    let lineRes = ""
    line.split(" ").forEach((word, i) => {
        if (word == "why" && i >= 2) lineRes += "-" + word
        else if (word == "and" && i >= 2)
            lineRes +=
                ' <phoneme alphabet="ipa" ph="ænd">thisisnotawort</phoneme>'
        else lineRes += " " + word
    })
    return lineRes.substring(1)
}

console.log("Before:")
console.log(allStrings)
console.log("After:")
console.log(allStrings.map((string) => stringFormatter(string)))
