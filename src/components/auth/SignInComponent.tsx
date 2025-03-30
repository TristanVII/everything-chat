"use client"

import { useState, useEffect, useRef } from "react"
import { signIn } from "next-auth/react"
import { FaXTwitter } from "react-icons/fa6"

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Make canvas full size
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    // Stars configuration
    const stars: {x: number, y: number, size: number, speed: number}[] = []
    const createStars = () => {
      stars.length = 0
      for (let i = 0; i < 150; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 1.5 + 0.5,
          speed: Math.random() * 0.5 + 0.1
        })
      }
    }
    
    createStars()
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#1A1500'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      stars.forEach(star => {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255, 245, 200, 0.8)'
        ctx.fill()
        
        // Move star
        star.x -= star.speed
        
        // Reset star position when it goes off screen
        if (star.x < 0) {
          star.x = canvas.width
          star.y = Math.random() * canvas.height
        }
      })
      
      requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [])

  const handleSignIn = async () => {
    setIsLoading(true)
    await signIn("twitter", {
      callbackUrl: "/home",
    })
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#000000]">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 h-full w-full"
        style={{ mask: 'radial-gradient(circle at center, black, transparent)' }}
      ></canvas>
      
      {/* Login card */}
      <div className="relative z-10 w-full max-w-md rounded-lg bg-transparent p-8 backdrop-blur-xs border border-[#333333]/30">
        {/* X Logo at top */}
        <div className="flex justify-center mb-10">
          <FaXTwitter className="h-8 w-8 text-white" />
        </div>

        {/* Main content */}
        <div className="space-y-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white">Your X-Chat conversations are ready</h1>
            <p className="text-base text-gray-400 mt-2">Let's get you connected with your network.</p>
          </div>
          
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full py-4 bg-[#000000]/70 hover:bg-[#FFFFFF]/20 text-white text-lg font-medium rounded-3xl border border-[#333333]/80" >
            {isLoading ? (
              <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <div className="flex items-center justify-center gap-2">
                <div>Login with</div>
                <FaXTwitter className="h-4 w-4" />
              </div>
            )}
          </button>
          
          <div className="text-center">
            <a 
              href="https://x.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-sm text-[#FFFFFF]/60 hover:underline"
            >
              The Everything App
            </a>
          </div>
        </div>
        
        <div className="mt-10 flex items-center justify-center gap-6 text-sm text-gray-500">
          <a href="#" className="hover:text-gray-300">Privacy</a>
          <span>•</span>
          <a href="#" className="hover:text-gray-300">Terms</a>
        </div>
      </div>
    </div>
  )
}
