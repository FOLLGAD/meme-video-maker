import React, { useEffect, useState } from 'react';
import apiFetch from './apiFetch';
import Modal from 'react-modal'

Modal.setAppElement('#root')

export default function ({ settings, dispatchSettings, onSubmit }) {
    const [files, setFiles] = useState({ videos: [], songs: [] })
    const [themes, setThemes] = useState([])

    useEffect(() => {
        apiFetch('/files')
            .then(d => d.json())
            .then(files => {
                setFiles(files)
            })
    }, [])

    const getThemes = () => {
        apiFetch('/themes')
            .then(d => d.json())
            .then(themes => {
                setThemes(themes)
            })
    }

    useEffect(() => getThemes(), [])

    const [loading, setLoading] = useState(false)

    const dispatchSet = type => e => dispatchSettings({ type, data: e.target.value })

    const submit = async (e) => {
        setLoading(true)
        await onSubmit(e)
        setLoading(false)
    }

    const [modalIsOpen, setIsOpen] = useState(false);
    const [themeName, setThemeName] = useState('');

    const saveTheme = e => {
        e.preventDefault()
        setLoading(true)

        apiFetch('/themes', {
            method: 'POST',
            body: JSON.stringify({
                ...settings,
                name: themeName,
            }),
            headers: {
                'content-type': 'application/json'
            }
        }).then(() => {
            setIsOpen(false)
            setLoading(false)
            setThemeName("")
            getThemes()
        })
    }

    const deleteTheme = id => () => {
        apiFetch('/themes/' + id, {
            method: 'DELETE',
        }).then(() => {
            getThemes()
        })
    }

    const selectTheme = theme => () => {
        dispatchSettings({ type: "intro", data: theme.intro || "" })
        dispatchSettings({ type: "transition", data: theme.transition || "" })
        dispatchSettings({ type: "outro", data: theme.outro || "" })
        dispatchSettings({ type: "song", data: theme.song || "" })
        dispatchSettings({ type: "voice", data: theme.voice || "" })
    }

    return (
        <div style={{ display: 'flex' }} className="container">
            <form style={{ flexGrow: 1 }} className="card">
                <div>
                    <label>
                        <div>Intro</div>
                        <select value={settings.intro} onChange={dispatchSet("intro")}>
                            <option value="">None</option>
                            {files.videos.map(file =>
                                <option key={file} value={file}>{file}</option>
                            )}
                        </select>
                    </label>
                </div>
                <div>
                    <label>
                        <div>Transition</div>
                        <select value={settings.transition} onChange={dispatchSet("transition")}>
                            <option value="">None</option>
                            {files.videos.map(file =>
                                <option key={file} value={file}>{file}</option>
                            )}
                        </select>
                    </label>
                </div>
                <div>
                    <label>
                        <div>Outro</div>
                        <select value={settings.outro} onChange={dispatchSet("outro")}>
                            <option value="">None</option>
                            {files.videos.map(file =>
                                <option key={file} value={file}>{file}</option>
                            )}
                        </select>
                    </label>
                </div>
                <div>
                    <label>
                        <div>Song</div>
                        <select value={settings.song} onChange={dispatchSet("song")}>
                            <option value="">None</option>
                            {files.songs.map(file =>
                                <option key={file} value={file}>{file}</option>
                            )}
                        </select>
                    </label>
                </div>
                <div>
                    <label>
                        <div>TTS voice</div>
                        <select value={settings.voice} onChange={dispatchSet("voice")}>
                            <option value="">Daniel UK</option>
                            <option value="google-us">Google (US)</option>
                            <option value="google-uk">Google (UK)</option>
                        </select>
                    </label>
                </div>

                <div style={{ padding: "10px 0" }}>
                    <button onClick={submit} disabled={loading}>Render</button>
                </div>
            </form>
            <div style={{ flexGrow: 1 }} className="card">
                <div className="themes">
                    {themes ? themes.map(theme => (
                        <div key={theme.themeId} className="theme" onClick={selectTheme(theme)}>
                            {theme.name}

                            <a className="delete" onClick={deleteTheme(theme.themeId)}>X</a>
                        </div>
                    )) : "Loading..."}
                </div>
                <button onClick={() => setIsOpen(true)}>Save current as new theme</button>

                <Modal isOpen={modalIsOpen}
                    onRequestClose={() => setIsOpen(false)}
                    contentLabel="Save theme"
                    style={{
                        content: {
                            top: '50%',
                            left: '50%',
                            right: 'auto',
                            bottom: 'auto',
                            marginRight: '-50%',
                            transform: 'translate(-50%, -50%)',
                            width: 300,
                        }
                    }}
                >
                    <h2>Save theme</h2>
                    <form>
                        <input type="text"
                            name="name"
                            placeholder="Theme name"
                            value={themeName}
                            onChange={e => setThemeName(e.target.value)} />

                        <br />

                        <button disabled={loading} onClick={saveTheme}>Submit</button>
                    </form>
                </Modal>
            </div>
        </div>
    )
}