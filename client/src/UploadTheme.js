import React, { useRef } from 'react';
import apiFetch from './apiFetch'

export default function Form() {
    const filesInp = useRef(null)

    const submit = event => {
        event.preventDefault()

        const fd = new FormData()
        const file = filesInp.current.files[0]

        fd.append("file", file)

        apiFetch('/upload-file', {
            body: fd,
            method: 'POST',
        }).then(res => {
            if (res.ok) {
                filesInp.current.value = null
            }
        })
    }

    return (
        <div>
            <form id="formed">
                <div>
                    <input ref={filesInp} accept=".mp4,.mp3" type="file" required />
                </div>
                <div style={{ paddingTop: 10 }}>
                    <input type="submit" value="Upload" onClick={submit} />
                </div>
            </form>
        </div>
    )
}
