export const apiUrl = process.env.REACT_APP_API_URL

export default function apiFetch(url, ...props) {
    return fetch(apiUrl + url, ...props)
}