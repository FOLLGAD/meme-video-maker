import { stringFormatter } from "./string-formatter"

let testString = ["Hello, my name", "is Emil lmao"]

let teststring2 = [
    "Tell me why me and my mom telling",
    "to my parents",
    "why I'm not monky",
]
let teststring3 = ["Me and my boys just chilling!"]
let teststring4 = [
    "me and my car and my brother",
    "and my log just relaxing on the beach but a",
    "bear came whereas they are rare",
    "although we survived",
]

let allStrings = [testString, teststring2, teststring3, teststring4]

console.log("Before:")
console.log(allStrings)
console.log("After:")
console.log(allStrings.map((string) => stringFormatter(string)))
