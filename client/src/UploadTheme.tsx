import React, { useRef, useState } from "react"
import apiFetch from "./apiFetch"

export default function Form() {
	const filesInp = useRef(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)

	const submit = (event) => {
		event.preventDefault()

		if (!filesInp.current.value) return // Early exit if no file

		setLoading(true)

		const fd = new FormData()
		const file = filesInp.current.files[0]

		fd.append("file", file)

		apiFetch("/upload-file", {
			body: fd,
			method: "POST",
		}).then((res) => {
			setLoading(false)
			if (res.ok) {
				setError(null)
				filesInp.current.value = null
			} else {
				setError("Something went wrong. Try again with another format.")
			}
		})
	}

	return (
		<div>
			<form id="formed">
                <p>Max allowed image size is 40MB</p>
				<div>{error ? error : ""}</div>
				<div>
					<input ref={filesInp} accept=".mp4,.mp3" type="file" />
				</div>
				<div style={{ paddingTop: 10 }}>
					<button type="submit" onClick={submit}>
						{loading ? "Loading..." : "Upload"}
					</button>
				</div>
			</form>
		</div>
	)
}
