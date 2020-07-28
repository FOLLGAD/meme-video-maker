import React, { useState } from 'react';
import Upload from './Upload';
import Edit from './Edit';
import apiFetch from './apiFetch';

function App() {
  const [images, setImages] = useState(null)
  const [res, setRes] = useState(null)

  const loadData = ({ images, res }) => {
    setRes(res)
    setImages(Array.from(images))
  }

  const finished = (blocks, images) => {
    const fd = new FormData()

    // Append files to formdata
    const info = []
    let i = 0
    for (const file of images) {
      fd.append("files", file, i.toString())
      info.push({ id: i.toString() })
      i++
    }

    fd.append("info", JSON.stringify(info))
    fd.append("enabled", JSON.stringify(blocks))

    apiFetch('/make-vid', {
      body: fd,
      method: 'POST',
    })
      .then(d => d.json())
      .then((d) => {
        console.log(d)
      })
  }

  return (
    <div>
      {images ?
        <Edit res={res} images={images} onFinish={finished} />
        :
        <Upload setData={loadData} />
      }
    </div>
  )
}

export default App;
