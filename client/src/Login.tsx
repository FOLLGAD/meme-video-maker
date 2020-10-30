import React, { useState } from "react"
import { useFetch } from "./apiFetch"
import Button from "./Button"

function Login({ onLogin }: { onLogin: any }) {
    const apiFetch = useFetch()
    const l = useState(false)

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const [error, setError] = useState<string | null>(null)

    const login = async () => {
        l[1](true)
        setError(null)
        apiFetch("/auth", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                email,
                password,
            }),
        })
            .then(async (res) => {
                l[1](false)
                if (res.ok) {
                    onLogin()
                } else {
                    let data = await res.json()
                    setError(data.error)
                }
            })
            .catch(async (err) => {
                setError(err.message)
                l[1](false)
            })
    }

    return (
        <div className="login" style={{ paddingTop: "8rem" }}>
            <form
                name="login-form"
                style={{ display: "flex", flexDirection: "column" }}
                onSubmit={(e) => e.preventDefault()}
            >
                <h2>Log in</h2>
                <input
                    type="text"
                    name="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ margin: "0.4rem" }}
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ margin: "0.4rem" }}
                />
                {error && (
                    <div
                        style={{
                            background: "#ffd2ca",
                            padding: "1.2rem 1rem",
                            margin: "0.8rem",
                            boxShadow:
                                "0px 0px 7px 0px rgb(200, 200, 200, 0.6)",
                            borderRadius: "0.3rem",
                        }}
                    >
                        Error: {error}
                    </div>
                )}
                <Button
                    loading={l[0]}
                    onClick={login}
                    style={{ margin: "0.4rem" }}
                >
                    Log in
                </Button>
            </form>
            <div style={{ paddingTop: "2rem" }}>
                Contact: <a href="mailto:emil@tentium.se">emil@tentium.se</a>
            </div>
            {/* <Register /> */}
        </div>
    )
}

export default Login
