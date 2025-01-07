"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

function ThemeColorSync() {
    const { theme, systemTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        if (mounted) {
            const currentTheme = theme === 'system' ? systemTheme : theme
            const themeColor = currentTheme === 'dark' ? '#1e1e1e' : '#ffffff'
            const metaThemeColor = document.querySelector('meta[name="theme-color"]')
            
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', themeColor)
            } else {
                const meta = document.createElement('meta')
                meta.name = 'theme-color'
                meta.content = themeColor
                document.head.appendChild(meta)
            }
        }
    }, [theme, systemTheme, mounted])

    return null
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return (
        <NextThemesProvider {...props}>
            <ThemeColorSync />
            {children}
        </NextThemesProvider>
    )
}