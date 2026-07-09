import { useEffect, useState } from "react"

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode
  defaultTheme?: "dark" | "light"
}) {
  const [theme, setTheme] = useState<"dark" | "light">(
    () => (localStorage.getItem("theme") as "dark" | "light") || defaultTheme
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
    localStorage.setItem("theme", theme)
  }, [theme])

  return (
    <div data-theme={theme} className="min-h-screen">
      {children}
    </div>
  )
}
