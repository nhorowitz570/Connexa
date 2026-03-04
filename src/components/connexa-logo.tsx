export function ConnexaLogo({ className }: { className?: string }) {
    return (
        <div className={`flex items-center gap-2 ${className ?? ""}`}>
            <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <rect width="32" height="32" rx="8" fill="url(#connexa-gradient)" />
                <path
                    d="M16 8L22 12V20L16 24L10 20V12L16 8Z"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    fill="none"
                />
                <circle cx="16" cy="16" r="3" fill="white" />
                <path d="M16 8V13" stroke="white" strokeWidth="1.5" />
                <path d="M16 19V24" stroke="white" strokeWidth="1.5" />
                <path d="M10 12L14 14.5" stroke="white" strokeWidth="1.5" />
                <path d="M18 17.5L22 20" stroke="white" strokeWidth="1.5" />
                <path d="M22 12L18 14.5" stroke="white" strokeWidth="1.5" />
                <path d="M14 17.5L10 20" stroke="white" strokeWidth="1.5" />
                <defs>
                    <linearGradient id="connexa-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#6366f1" />
                        <stop offset="1" stopColor="#4f46e5" />
                    </linearGradient>
                </defs>
            </svg>
            <span className="text-xl font-semibold tracking-tight text-white">
                Connexa<span className="text-indigo-400">AI</span>
            </span>
        </div>
    )
}
