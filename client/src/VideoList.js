import React, { useEffect, useState } from "react"
import apiFetch, { apiUrl } from "./apiFetch"

export default function () {
    const [videos, setVids] = useState(null)

    const getVids = () => {
        apiFetch("/vids")
            .then((d) => d.json())
            .then((vids) => {
                setVids(vids.data)
            })
    }

    useEffect(() => getVids(), [])

    return (
        <div className="videolist-container">
            <h2 style={{ marginBottom: 10 }}>Last videos</h2>
            <div className="videolist">
                {videos
                    ? videos.map((vid) => {
                          let d = new Date(vid.LastModified)
                          return (
                              <a
                                  key={vid.Key}
                                  download={true}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  href={`${apiUrl}/vids/${vid.Key}`}
                              >
                                  <div key={vid.Key} className="video">
                                      {vid.Key}
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
