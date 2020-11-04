import { useCallback, useContext } from "react"
import { Context } from "./Store"

export const apiUrl = process.env.REACT_APP_API_URL

export default function apiFetch(url: string, reqInit?: RequestInit) {
    return fetch(apiUrl + url, { ...reqInit, credentials: "include" })
}

export function useFetch() {
    const [, dispatch] = useContext(Context)

    return useCallback(
        (url: string, reqInit?: RequestInit) => {
            return apiFetch(url, reqInit).then((res) => {
                if (res.status === 401) {
                    dispatch({ type: "LOGOUT" })
                    throw new Error("Unauthorized")
                }
                return res
            })
        },
        [dispatch]
    )
}
