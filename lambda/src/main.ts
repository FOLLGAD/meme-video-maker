import * as AWS from "aws-sdk"
// Create client outside of handler to reuse
const lambda = new AWS.Lambda()

interface Event {}

// Handler
exports.handler = async function (event: Event) {
    console.log(event)
    try {
        let accountSettings = await getAccountSettings()
        console.log(accountSettings)
    } catch (error) {
        console.log(error)
    }
}
// Use SDK client
var getAccountSettings = function () {
    return lambda.getAccountSettings().promise()
}
