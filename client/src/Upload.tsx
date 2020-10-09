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

        const fd = new FormData()
        const files = filesInp!.current!.files
        if (!files || files.length === 0) {
            return
        }
        setLoading(true)
        setError(null)

        // Append files to formdata
        const info: { id: string }[] = []
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            fd.append("files", file, i.toString())
            info.push({ id: i.toString() })
        }

        fd.append("info", JSON.stringify(info))

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
