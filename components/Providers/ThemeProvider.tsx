"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

function ThemeColorSync() {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        if (mounted && resolvedTheme) {
            const isDark = resolvedTheme === 'dark'
            const themeColor = isDark ? '#1F1F1F' : '#ffffff'
            const scheme = isDark ? 'dark' : 'light'

            // Clean up existing theme-color tags (including SSR media-query tags)
            // so the dynamic theme color unconditionally controls the window title bar
            const existingMeta = document.querySelectorAll('meta[name="theme-color"]')
            existingMeta.forEach((tag) => tag.remove())

            const meta = document.createElement('meta')
            meta.setAttribute('name', 'theme-color')
            meta.setAttribute('content', themeColor)
            document.head.appendChild(meta)

            // Sync root color scheme and color-scheme meta tag so Windows/PWA window controls match
            document.documentElement.style.colorScheme = scheme
            let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]')
            if (!colorSchemeMeta) {
                colorSchemeMeta = document.createElement('meta')
                colorSchemeMeta.setAttribute('name', 'color-scheme')
                document.head.appendChild(colorSchemeMeta)
            }
            colorSchemeMeta.setAttribute('content', scheme)
        }
    }, [resolvedTheme, mounted])

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