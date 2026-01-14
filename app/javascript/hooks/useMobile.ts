import { useState, useEffect } from 'react';

/**
 * Custom hook to detect mobile screen size
 * @param breakpoint - Screen width breakpoint in pixels (default: 768)
 * @returns boolean indicating if screen is mobile
 */
export function useMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}
