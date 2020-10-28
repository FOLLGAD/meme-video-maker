import React, { useRef, useState } from "react"
import apiFetch from "./apiFetch"

export default function Form({ setData }: { setData: (data: any) => void }) {
    const filesInp = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submit = async (
        event: React.MouseEvent<HTMLButtonElement, MouseEvent>
    ) => {
        event.preventDefault()

        const files = filesInp!.current!.files
        if (!files || files.length === 0) {
            return
        }
        setLoading(true)
        setError(null)

        const urls: {
            fields: { [key: string]: string }
            url: string
        }[] = await apiFetch(`/v2/get-signed-urls?amount=${files.length}`, {
            method: "POST",
        }).then((p) => p.json())

        // https://blog.rocketinsights.com/uploading-images-to-s3-via-the-browser/

        const images: { file: File; key: string }[] = []

        for (let i = 0; i < urls.length; i++) {
            let fd = new FormData()

            const { key } = urls[i].fields

            fd.append("Content-Type", files[i].type)

            Object.entries(urls[i].fields).forEach(([k, v]) => {
                fd.append(k, v)
            })

            fd.append("file", files[i])

            const res = await fetch(urls[i].url, {
                body: fd,
                method: "POST",
            })
            if (!res.ok) {
                console.error(i, "FAILED!")
            }
            images.push({ file: files[i], key })
        }

        // Append files to formdata

        apiFetch("/v2/vision", {
            body: JSON.stringify(images.map((i) => i.key)),
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
        })
            .then(async (d) => {
                if (!d.ok) {
                    throw await d.json()
                }
                return await d.json()
            })
            .then((res) => {
                setLoading(false)
                setData({ res: res, images })
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
