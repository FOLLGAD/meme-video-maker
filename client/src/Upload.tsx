/// <reference types="aws-sdk" />
import AWS from "aws-sdk"
import { CognitoIdentityCredentials } from "aws-sdk"
import React, { useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"

// `AWS.region = "..."` disables autocomplete in VS Code for some reason!! wtf

AWS.config.update({
    region: "eu-central-1", // Region
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: "eu-central-1:f9d40dab-3659-4f21-8e65-dbf590212d7b",
    }),
})
AWS.config = new AWS.Config()
AWS.config.region = "eu-central-1"
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: "eu-central-1:f9d40dab-3659-4f21-8e65-dbf590212d7b",
})
const s3 = new AWS.S3({
    region: "eu-central-1",
    credentials: new CognitoIdentityCredentials({
        IdentityPoolId: "f9d40dab-3659-4f21-8e65-dbf590212d7b",
    }),
})
s3.config = new AWS.Config()
s3.config.region = "eu-central-1"
s3.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: "eu-central-1:f9d40dab-3659-4f21-8e65-dbf590212d7b",
})

const MemesBucket = "carp-memes"

export default function Form({ setData }: { setData: (data: any) => void }) {
    const filesInp = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    const submit = async (
        event: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        event.preventDefault()

        if (!filesInp.current || !filesInp.current.files) return

        const { files } = filesInp.current
        if (files.length === 0) {
            return
        }
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            /*
                TODO:
                - add the cognito pool id somehow
                - upload all images there
                - send the urls to the carp API instead of the images
                - change the api to accept urls for google vision
                - same as above but for the video rendering part
            */
            const origname = file.name
            const key = uuidv4()
            const val = await new Promise<AWS.S3.PutObjectOutput>(
                (res, rej) => {
                    s3.putObject(
                        {
                            Bucket: MemesBucket,
                            Key: key,
                            Body: file,
                            Metadata: {
                                filename: origname,
                            },
                        },
                        (err, data) => {
                            err ? rej(err) : res(data)
                        }
                    )
                }
            )
            console.log("Etag:", val.ETag)
        }

        // apiFetch("/vision", {
        //     // body: fd,
        //     method: "POST",
        // })
        //     .then(async (d) => {
        //         if (!d.ok) {
        //             throw await d.json()
        //         }
        //         return await d.json()
        //     })
        //     .then((d) => {
        //         setLoading(false)
        //         setData({ res: d, images: files })
        //     })
        //     .catch((d) => {
        //         setLoading(false)
        //         console.log(d)
        //         setError(d.message || d.error)
        //     })
    }

    return (
        <div>
            <form id="formed">
                <p>Max allowed image size is 20MB</p>
                <div>
                    <input
                        ref={filesInp}
                        accept="png"
                        type="file"
                        required
                        multiple
                    />
                </div>
                {error && (
                    <div
                        style={{
                            background: "#f4e6e6",
                            border: "1px solid #eee",
                            borderRadius: 5,
                            padding: "5px 10px",
                            margin: "10px 0 0 0",
                        }}
                    >
                        Error: {error}
                    </div>
                )}
                <div style={{ paddingTop: 10 }}>
                    <button type="submit" onClick={submit} disabled={loading}>
                        {loading ? "Loading..." : "Go"}
                    </button>
                </div>
            </form>
        </div>
    )
}
