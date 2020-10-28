import React, { useEffect, useState } from "react"
import apiFetch from "./apiFetch"
import { Pipeline } from "./EditImage"
import Editor from "./Editor"
import Upload from "./Upload"
import UploadTheme from "./UploadTheme"
import VideoList from "./VideoList"

export interface FileKey {
    file: File
    key: string
}

function App() {
    const [images, setImages] = useState<FileKey[] | null>(null)
    const [res, setRes] = useState<any[] | null>(null)
    const [dirty, setDirty] = useState(false)

    const loadData = ({ images, res }) => {
        setRes(res)
        setImages(images)
        setDirty(true)
    }

    useEffect(() => {
        const func = (e) => {
            if (dirty) e.preventDefault()
        }
        window.addEventListener("beforeunload", func)
        return () => window.removeEventListener("beforeunload", func)
    }, [dirty])

    const finished = (pipeline: Pipeline[], settings) => {
        return apiFetch("/v2/render", {
            body: JSON.stringify({ pipeline, settings }),
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
        }).then((d) => d.json())
    }

    return (
        <div className="app">
            {images && res ? (
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
