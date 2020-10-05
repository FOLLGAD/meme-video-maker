import React, { useState, useEffect } from "react"
import Upload from "./Upload"
import UploadTheme from "./UploadTheme"
import Editor from "./Editor"
import apiFetch from "./apiFetch"
import VideoList from "./VideoList"

function App() {
    const [images, setImages] = useState<any[] | null>(null)
    const [res, setRes] = useState(null)
    const [dirty, setDirty] = useState(false)

    const loadData = ({ images, res }) => {
        setRes(res)
        setImages(Array.from(images))
        setDirty(true)
    }

    useEffect(() => {
        const func = (e) => {
            if (dirty) e.preventDefault()
        }
        window.addEventListener("beforeunload", func)
        return () => window.removeEventListener("beforeunload", func)
    }, [dirty])

    const finished = (blocks, images, settings) => {
        const fd = new FormData()

        // Append files to formdata
        const info: any[] = []
        let i = 0
        for (const file of images) {
            fd.append("files", file, i.toString())
            info.push({ id: i.toString() })
            i++
        }

        fd.append("info", JSON.stringify(info))
        fd.append("pipeline", JSON.stringify(blocks))
        fd.append("settings", JSON.stringify(settings))

        return apiFetch("/make-vid", {
            body: fd,
            method: "POST",
        }).then((d) => d.json())
    }

    return (
        <div className="app">
            {images ? (
                <Editor res={res} images={images} onFinish={finished} />
            ) : (
                <div style={{ display: "flex" }}>
                    <div style={{ flexGrow: 1, flexBasis: 1, minWidth: 300 }}>
                        <div className="card">
                            <h3>Upload memes (png/jpg/gif)</h3>
                            <Upload setData={loadData} />
                        </div>
                        <div className="card">
                            <h3>
                                Upload intro/outro/transition/song <br /> (for
                                creating theme later)
                            </h3>
                            <UploadTheme />
                        </div>
                    </div>
                    <div
                        className="card"
                        style={{ flexGrow: 1, flexBasis: 1, minWidth: 300 }}
                    >
                        <VideoList />
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
