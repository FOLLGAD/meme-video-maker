import React, { useState } from "react"
import { useFetch } from "./apiFetch"
import Button from "./Button"

function Register({ onRegister }: { onRegister?: any }) {
    const apiFetch = useFetch()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const register = async () => {
        const res = await apiFetch("/register", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                email,
                password,
            }),
        })
        console.log(res)
    }

    return (
        <div className="login">
            <form
                name="login-form"
                style={{ display: "flex", flexDirection: "column" }}
                onSubmit={(e) => e.preventDefault()}
            >
                <h1>Register</h1>
                <input
                    type="text"
                    name="email"
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                    placeholder="Email"
                />
                <input
                    type="password"
                    name="password"
                    onChange={(e) => setPassword(e.target.value)}
                    value={password}
                    placeholder="Password"
                />
                <Button onClick={register}>Register</Button>
            </form>
        </div>
    )
}

export default Register
