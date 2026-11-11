import { useMemo, type FC } from 'react';
import katex from 'katex';

export const MathTex: FC<{ tex: string; display?: boolean; className?: string }> = ({
  tex,
  display = false,
  className = '',
}) => {
  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
      }),
    [tex, display]
  );
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};

export interface SvgMathProps {
  x: number;
  y: number;
  width: number;
  height: number;
  tex: string;
  display?: boolean;
  align?: 'left' | 'center' | 'right';
  color?: string;
  fontSize?: number;
  bg?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: string;
}

export const SvgMath: FC<SvgMathProps> = ({
  x,
  y,
  width,
  height,
  tex,
  display = false,
  align = 'center',
  color = '#0f172a',
  fontSize = 13,
  bg,
  borderColor,
  borderRadius = 6,
  padding = '0px',
}) => {
  // Boost sub-12.5px SVG math slightly so KaTeX '=' double bars never alias into '-' inside scaled SVGs
  const effectiveFontSize = fontSize < 12.5 ? Math.min(12.5, fontSize + 1.2) : fontSize;

  const html = useMemo(
    () =>
      katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
      }),
    [tex, display]
  );

  const justifyContent =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  return (
    <foreignObject
      x={x}
      y={y}
      width={width}
      height={height}
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <div
        className="scrolly-math"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent,
          color,
          fontSize: `${effectiveFontSize}px`,
          background: bg,
          border: borderColor ? `1px solid ${borderColor}` : undefined,
          borderRadius: bg || borderColor ? `${borderRadius}px` : undefined,
          padding,
          boxSizing: 'border-box',
          whiteSpace: 'nowrap',
          lineHeight: 1.15,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </foreignObject>
  );
};
