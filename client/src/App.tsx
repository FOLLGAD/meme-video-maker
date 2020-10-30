import React, { useContext, useEffect, useState } from "react"
import { useFetch } from "./apiFetch"
import Button from "./Button"
import { Pipeline } from "./EditImage"
import Editor from "./Editor"
import FileList from "./FileList"
import Login from "./Login"
import { Context } from "./Store"
import Upload from "./Upload"
import VideoList from "./VideoList"

export interface FileKey {
    file: File
    key: string
}

function App() {
    const apiFetch = useFetch()
    const [state, dispatch] = useContext(Context)
    const [images, setImages] = useState<FileKey[] | null>(null)
    const [res, setRes] = useState<any[] | null>(null)
    const [dirty, setDirty] = useState(false)

    useEffect(() => {
        const func = (e) => {
            if (dirty) e.preventDefault()
        }
        window.addEventListener("beforeunload", func)
        return () => window.removeEventListener("beforeunload", func)
    }, [dirty])

    if (!state.loggedIn) {
        return (
            <div className="app">
                <Login onLogin={() => dispatch({ type: "LOGIN" })} />
            </div>
        )
    }

    const loadData = ({ images, res }) => {
        setRes(res)
        setImages(images)
        setDirty(true)
    }

    const finished = (pipeline: Pipeline[], settings) => {
        return apiFetch("/v2/render", {
            body: JSON.stringify({ pipeline, settings }),
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
        }).then((d) => d.json())
    }

    const logout = () => {
        apiFetch("/logout", {
            method: "POST",
        }).then(() => {
            dispatch({ type: "LOGOUT" })
        })
    }

    return (
        <div>
            <div className="app">
                {images && res ? (
                    <Editor res={res} images={images} onFinish={finished} />
                ) : (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <div style={{ display: "flex" }}>
                            <div
                                style={{
                                    flexGrow: 1,
                                    flexBasis: 1,
                                    minWidth: 300,
                                }}
                            >
                                <div className="card">
                                    <h3>Upload memes</h3>
                                    <p>Allowed formats: .png, .jpg, .gif</p>
                                    <Upload setData={loadData} />
                                </div>
                                <div className="card">
                                    <h3>
                                        Upload intro/outro/transition/song
                                        <br /> (for creating theme later)
                                    </h3>
                                    <FileList />
                                </div>
                            </div>
                            <div
                                className="card"
                                style={{
                                    flexGrow: 1,
                                    flexBasis: 1,
                                    minWidth: 300,
                                }}
                            >
                                <VideoList />
                            </div>
                        </div>
                        <div style={{ width: 720 }}>
                            <Button onClick={logout}>Log out</Button>
                            <div style={{ paddingTop: "2rem" }}>
                                Contact:{" "}
                                <a href="mailto:emil@tentium.se">
                                    emil@tentium.se
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default App
