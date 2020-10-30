import React, { useEffect, useState } from "react"
import { apiUrl, useFetch } from "./apiFetch"
import { removeNamespace } from "./utils"
import UploadTheme from "./UploadTheme"

export default function () {
    const apiFetch = useFetch()

    const [data, setData] = useState<{
        songs: string[]
        videos: string[]
    } | null>(null)

    const getVids = () => {
        apiFetch("/files")
            .then((d) => d.json())
            .then((data) => {
                setData(data)
            })
    }

    const deleteFile = (key) => {
        apiFetch("/files/" + key, { method: "DELETE" }).then(() => {
            getVids()
        })
    }

    useEffect(() => getVids(), [])

    return (
        <div className="videolist-container">
            <UploadTheme onUploaded={getVids} />
            <h2 style={{ marginBottom: 10, marginTop: 10 }}>Files</h2>
            <div className="videolist">
                {data
                    ? data.videos.map((vid) => {
                          let key = removeNamespace(vid)
                          return (
                              <div
                                  key={key}
                                  style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "0.2rem 0.4rem",
                                      border: "thin solid #eee",
                                      borderRadius: "5px",
                                      marginTop: 5,
                                  }}
                              >
                                  <a
                                      download
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      href={`${apiUrl}/files/${key}`}
                                  >
                                      <div>{key}</div>
                                  </a>
                                  <button onClick={() => deleteFile(key)}>
                                      Delete
                                  </button>
                              </div>
                          )
                      })
                    : "Loading..."}
            </div>
            <h2 style={{ marginBottom: 10, marginTop: 10 }}>Songs</h2>
            <div className="videolist">
                {data
                    ? data.songs.map((vid) => {
                          let key = removeNamespace(vid)
                          return (
                              <div
                                  key={key}
                                  style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "0.2rem 0.4rem",
                                      border: "thin solid #eee",
                                      borderRadius: "5px",
                                      marginTop: 5,
                                  }}
                              >
                                  <a
                                      download
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      href={`${apiUrl}/files/${key}`}
                                  >
                                      <div>{key}</div>
                                  </a>
                                  <button onClick={() => deleteFile(key)}>
                                      Delete
                                  </button>
                              </div>
                          )
                      })
                    : "Loading..."}
            </div>
        </div>
    )
}
