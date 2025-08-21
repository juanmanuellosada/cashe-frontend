"use client"
import { Moon, Sun } from "lucide-react"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const [theme, setTheme] = useState("light")

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem("cashe-theme") || "light"
    setTheme(savedTheme)
    document.documentElement.classList.toggle("dark", savedTheme === "dark")
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("cashe-theme", newTheme)
    document.documentElement.classList.toggle("dark", newTheme === "dark")
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme}>
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
