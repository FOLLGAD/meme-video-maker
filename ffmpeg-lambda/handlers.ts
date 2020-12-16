import { Handler, Context, Callback } from "aws-lambda"
import { S3 } from "aws-sdk"

const s3 = new S3({ region: "eu-central-1" })

export const hello = async (event: any) => {
    return {
        statusCode: 200,
        body: JSON.stringify(
            {
                message:
                    "Go Serverless v1.0! Your function executed successfully!",
                input: event,
            },
            null,
            2
        ),
    }

    // Use this code if you don't use the http event with the LAMBDA-PROXY integration
    // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
}
