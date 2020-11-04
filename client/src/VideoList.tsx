import React, { useCallback, useEffect, useState } from "react"
import { apiUrl, useFetch } from "./apiFetch"
import { removeNamespace } from "./utils"

export default function VideoList() {
    const apiFetch = useFetch()

    const [data, setData] = useState<{ data: any[]; inProgress: any[] } | null>(
        null
    )

    const getVids = useCallback(() => {
        apiFetch("/vids")
            .then((d) => d.json())
            .then((data) => {
                setData(data)
            })
    }, [apiFetch])

    useEffect(() => getVids(), [getVids])

    return (
        <div className="videolist-container">
            <h2 style={{ marginBottom: 10 }}>Last videos</h2>
            {data &&
                (data.inProgress.length > 0 ? (
                    <p>{data.inProgress.length} videos in progress</p>
                ) : (
                    <p>No videos in progress</p>
                ))}
            <div className="videolist">
                {data
                    ? data.data.map((vid) => {
                          let d = vid.LastModified || new Date()
                          let key = removeNamespace(vid.Key)
                          return (
                              <a
                                  key={key}
                                  download
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  href={`${apiUrl}/vids/${key}`}
                              >
                                  <div key={key} className="video">
                                      {key}
                                      <br />
                                      {d.toLocaleString()}
                                  </div>
                              </a>
                          )
                      })
                    : "Loading..."}
            </div>
        </div>
    )
}
