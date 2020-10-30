import React, { createContext, useReducer } from "react"

const Reducer = (state, action) => {
    switch (action.type) {
        case "LOGOUT":
            localStorage.setItem("loggedIn", "false")
            return {
                ...state,
                loggedIn: false,
            }
        case "LOGIN":
            localStorage.setItem("loggedIn", "true")
            return {
                ...state,
                loggedIn: true,
            }
        default:
            return state
    }
}

const initialState = {
    loggedIn: localStorage.getItem("loggedIn") === "true",
}

const Store = ({ children }) => {
    const [state, dispatch] = useReducer(Reducer, initialState)
    return (
        <Context.Provider value={[state, dispatch]}>
            {children}
        </Context.Provider>
    )
}

export const Context = createContext<[any, any]>([initialState, () => {}])
export default Store
