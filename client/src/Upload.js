import React, { useRef } from 'react';
import apiFetch from './apiFetch'

export default function Form({ setData }) {
    const filesInp = useRef(null)

    const submit = event => {
        event.preventDefault()

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

        apiFetch('/vision', {
            body: fd,
            method: 'POST',
        }).then(d => d.json()).then((d) => {
            setData({ res: d, images: files })
        })
    }

    return (
        <div>
            <form id="formed">
                <input ref={filesInp} accept="png" type="file" required multiple />
                <input type="submit" value="Go" onClick={submit} />
            </form>
        </div>
    )
}
