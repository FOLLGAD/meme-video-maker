import React, { useRef, useState } from "react"
import apiFetch from "./apiFetch"

export default function Form() {
    const filesInp = useRef<HTMLInputElement>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submit = (event) => {
        event.preventDefault()
        const fi = filesInp.current

        if (!fi || !fi.files) return // Early exit if no file

        setLoading(true)

        const fd = new FormData()
        const file = fi.files[0]

        fd.append("file", file)

        apiFetch("/upload-file", {
            body: fd,
            method: "POST",
        }).then((res) => {
            setLoading(false)
            if (res.ok) {
                setError(null)
                fi.value = ""
            } else {
                setError("Something went wrong. Try again with another format.")
            }
        })
    }

    return (
        <div>
            <form id="formed">
                <p>Max allowed image size is 40MB</p>
                <div>{error ? error : ""}</div>
                <div>
                    <input ref={filesInp} accept=".mp4,.mp3" type="file" />
                </div>
                <div style={{ paddingTop: 10 }}>
                    <button type="submit" onClick={submit}>
                        {loading ? "Loading..." : "Upload"}
                    </button>
                </div>
            </form>
        </div>
    )
}
