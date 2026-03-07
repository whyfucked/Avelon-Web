export function Logo({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 32 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="16" cy="1" r="1" fill="currentColor"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      
      <path d="M16 6L14.5 11H17.5L16 6Z" fill="currentColor"/>
      
      <path d="M14.5 11L12.5 17L3 39H7L13 19L14.5 11Z" fill="currentColor"/>
      
      <path d="M17.5 11L19.5 17L29 39H25L19 19L17.5 11Z" fill="currentColor"/>
      
      <rect x="11.5" y="16" width="9" height="1.5" rx="0.5" fill="currentColor"/>
      
      <rect x="9" y="24" width="14" height="2" rx="0.5" fill="currentColor"/>
      
      <rect x="5.5" y="33" width="21" height="1.5" rx="0.5" fill="currentColor"/>
      
      <line x1="12.5" y1="17.5" x2="10" y2="24" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.6"/>
      <line x1="19.5" y1="17.5" x2="22" y2="24" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.6"/>
      <line x1="14.5" y1="17.5" x2="12" y2="24" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.6"/>
      <line x1="17.5" y1="17.5" x2="20" y2="24" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.6"/>
      
      <line x1="10" y1="26" x2="7" y2="33" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.6"/>
      <line x1="22" y1="26" x2="25" y2="33" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.6"/>
      <line x1="13" y1="26" x2="9" y2="33" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.6"/>
      <line x1="19" y1="26" x2="23" y2="33" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.6"/>
      
      <path 
        d="M9 39C9 35.5 12 32.5 16 32.5C20 32.5 23 35.5 23 39" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      
      <path d="M3 39L5 37H7L3 40H1.5L3 39Z" fill="currentColor"/>
      <path d="M29 39L27 37H25L29 40H30.5L29 39Z" fill="currentColor"/>
    </svg>
  )
}
