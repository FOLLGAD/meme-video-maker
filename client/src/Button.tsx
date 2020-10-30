import React from "react"

function Button({
    loading = false,
    buttonText = "Continue",
    children,
    ...props
}: {
    loading?: boolean
    buttonText?: string
    children?: any
    [key: string]: any
}) {
    return (
        <button disabled={loading} {...props}>
            {!loading ? children : "Loading..."}
        </button>
    )
}

export default Button
