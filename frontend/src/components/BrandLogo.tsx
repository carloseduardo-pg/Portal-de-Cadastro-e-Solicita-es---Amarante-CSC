type BrandLogoProps = {
  className?: string;
  variant?: 'full' | 'compact';
};

/** Logo Amarante vazado — completo ou símbolo abreviado. */
export function BrandLogo({ className, variant = 'full' }: BrandLogoProps) {
  const src =
    variant === 'compact'
      ? '/marca/logo_vazado_simples.png'
      : '/marca/logo_vazado_completo.png';

  return <img src={src} alt="Amarante" className={className} />;
};
