export const apiUrl = process.env.REACT_APP_API_URL

export default function apiFetch(url: string, reqInit?: RequestInit) {
    return fetch(apiUrl + url, reqInit)
}
