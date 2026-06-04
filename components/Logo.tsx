import React from 'react';

interface LogoProps {
  /** Tailwind classes for the logo image (controls size). */
  imgClassName?: string;
  /** Show the wordmark next to the logo. */
  showText?: boolean;
  text?: string;
  textClassName?: string;
  className?: string;
}

/** Kambi Academy brand mark — logo image with an optional wordmark. */
const Logo: React.FC<LogoProps> = ({
  imgClassName = 'h-9 w-9',
  showText = true,
  text = 'Kambi Academy',
  textClassName = 'font-display text-lg font-bold text-slate-900',
  className = '',
}) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <img src="/kambiacademy_logo.jpg" alt="Kambi Academy" className={`shrink-0 rounded-lg object-contain ${imgClassName}`} />
    {showText && <span className={textClassName}>{text}</span>}
  </span>
);

export default Logo;
