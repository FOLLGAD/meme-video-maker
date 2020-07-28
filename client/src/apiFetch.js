export default function apiFetch(url, ...props) {
    const nurl = `http://localhost:7000${url}`

    return fetch(nurl.toString(), ...props)
}