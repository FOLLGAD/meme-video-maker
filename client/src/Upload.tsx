import React, { useRef, useState } from "react"
import { useFetch } from "./apiFetch"

export default function Form({ setData }: { setData: (data: any) => void }) {
    const apiFetch = useFetch()
    const filesInp = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [progress, setProgress] = useState<{
        uploaded: boolean
        progress: number
    } | null>(null)

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

        const urls: string[] = await apiFetch(
            `/v2/get-signed-urls?amount=${files.length}`,
            {
                method: "POST",
            }
        ).then((p) => p.json())

        // https://blog.rocketinsights.com/uploading-images-to-s3-via-the-browser/

        const images: { file: File; key: string }[] = []

        for (let i = 0; i < urls.length; i++) {
            setProgress({ uploaded: false, progress: i })
            const key = urls[i]

            console.log(files[i].type)

            const res = await fetch(urls[i], {
                body: files[i],
                method: "PUT",
                headers: {
                    "content-type": files[i].type,
                },
            })
            if (!res.ok) {
                console.error(i, "FAILED!")
            }
            images.push({ file: files[i], key })
        }
        setProgress({ uploaded: true, progress: 0 })

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
                setProgress(null)
                setData({ res: res, images })
            })
            .catch((d) => {
                setLoading(false)
                console.log(d)
                setProgress(null)
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
                    {progress && (
                        <span style={{ marginLeft: 10 }}>
                            {progress.uploaded
                                ? "Loading images..."
                                : `Uploading image ${progress.progress + 1}...`}
                        </span>
                    )}
                </div>
            </form>
        </div>
    )
}
