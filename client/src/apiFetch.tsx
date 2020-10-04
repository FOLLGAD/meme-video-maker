export const apiUrl = process.env.REACT_APP_API_URL

export default function apiFetch(url: string, ...props: any[]) {
    return fetch(apiUrl + url, ...props)
}
