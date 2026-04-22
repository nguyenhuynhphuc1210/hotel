'use client'

import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { Loader2 } from 'lucide-react'

interface Props {
    onSuccess: (idToken: string) => Promise<void>
    loading?: boolean
}

export default function GoogleLoginButton({ onSuccess, loading }: Props) {
    const handleSuccess = (credentialResponse: CredentialResponse) => {
        const idToken = credentialResponse.credential
        if (!idToken) return
        onSuccess(idToken)
    }

    if (loading) {
        return (
            <div className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                Đang xử lý...
            </div>
        )
    }

    return (
        <div className="w-full flex justify-center">
            <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => console.error('Google Login Failed')}
                width="368"
                text="signin_with"
                shape="rectangular"
                logo_alignment="left"
            />
        </div>
    )
}