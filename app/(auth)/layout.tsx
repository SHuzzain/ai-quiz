import React, { PropsWithChildren } from 'react'


const AuthLayout = ({ children }: PropsWithChildren) => {
    return (
        <main className='flex justify-center items-center h-dvh'>{children}</main>
    )
}

export default AuthLayout