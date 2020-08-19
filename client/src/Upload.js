import React, { useRef, useState } from "react"
import apiFetch from "./apiFetch"

export default function Form({ setData }) {
    const filesInp = useRef(null)
    const [loading, setLoading] = useState(false)

    const submit = (event) => {
        event.preventDefault()
        setLoading(true)

        const fd = new FormData()
        const files = filesInp.current.files

        // Append files to formdata
        const info = []
        let i = 0
        for (const file of files) {
            fd.append("files", file, i.toString())
            info.push({ id: i.toString() })
            i++
        }

        fd.append("info", JSON.stringify(info))

        apiFetch("/vision", {
            body: fd,
            method: "POST",
        })
            .then((d) => d.json())
            .then((d) => {
                setLoading(false)
                setData({ res: d, images: files })
            })
    }

    return (
        <div>
            <form id="formed">
                <div>
                    <input
                        ref={filesInp}
                        accept="png"
                        type="file"
                        required
                        multiple
                    />
                </div>
                <div style={{ paddingTop: 10 }}>
                    <button type="submit" onClick={submit}>
                        {loading ? "Loading..." : "Go"}
                    </button>
                </div>
            </form>
        </div>
    )
}
