const replaceDict = [
    {
        regex: /fucking/,
        replace: "effing",
    },
    {
        regex: /fuckin/,
        replace: "effin",
    },
    {
        regex: /fuck/,
        replace: "f ",
    },
    {
        regex: /shit/,
        replace: "sh ",
    },
    {
        regex: /dicks/,
        replace: "dees ",
    },
    {
        regex: /dick/,
        replace: "peepee ",
    },
    {
        regex: /penis/,
        replace: "peepee ",
    },
    {
        regex: /bitches/,
        replace: "bees ",
    },
    {
        regex: /bitch/,
        replace: "bee ",
    },
    {
        regex: /retarded/,
        replace: "idiotic ",
    },
    {
        regex: /retard/,
        replace: "idiot ",
    },
    {
        regex: /cunt/,
        replace: "c ",
    },
    {
        regex: /pussy/,
        replace: "p-word ",
    },
    {
        regex: /nigg(a|er)/,
        replace: "bro ",
    },
    {
        regex: /\.com/,
        replace: " dot com",
    },
    {
        regex: /ass(hat|face|head|burger|hole)/,
        replace: "a-$1",
    },
    {
        regex: /cocaine/,
        replace: "coke",
    },
]

// Returns a cleaned string
export function preSanitize(text) {
    replaceDict.forEach((elem) => {
        // Replaces every occurance with the the corresponding value in the dictionary
        text = text.replace(new RegExp(elem.regex, "gmi"), elem.replace)
    })
    return text
}
