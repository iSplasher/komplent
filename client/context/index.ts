import React from 'react'

interface Profile {
    profile_id: string
    profile_user: object
    profile_path: string
}

export const ProfileContext = React.createContext<Profile>(null)

interface Login {
    next_page?: string | boolean
}

export const LoginContext = React.createContext<Login>({})