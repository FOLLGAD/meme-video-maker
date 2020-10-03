import React, { useRef, useState } from "react"
import apiFetch from "./apiFetch"
import { v4 as uuidv4 } from "uuid"

// `AWS.region = "..."` disables autocomplete in VS Code for some reason!! wtf
window["AWS"].region = "eu-central-1" // Region
window["AWS"].credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: "eu-central-1:f9d40dab-3659-4f21-8e65-dbf590212d7b",
})
const s3 = new AWS.S3()

const MemesBucket = "carp-memes"

export default function Form({ setData }) {
    const filesInp = useRef(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    const submit = (event) => {
        event.preventDefault()

        const files = filesInp.current.files
        if (files.length === 0) {
            return
        }
        for (const file of files) {
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
            s3.putObject({
                Bucket: MemesBucket,
                Key: key,
                Metadata: {
                    filename: origname,
                },
            })
        }

        apiFetch("/vision", {
            body: fd,
            method: "POST",
        })
            .then(async (d) => {
                if (!d.ok) {
                    throw await d.json()
                }
                return await d.json()
            })
            .then((d) => {
                setLoading(false)
                setData({ res: d, images: files })
            })
            .catch((d) => {
                setLoading(false)
                console.log(d)
                setError(d.message || d.error)
            })
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
