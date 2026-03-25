"use client";
import { StudySession } from "@/lib/store";

interface ProgressChartProps {
  data: number[];
  labels: string[];
  color?: string;
  height?: number;
  showGrid?: boolean;
  animated?: boolean;
}

export function ProgressChart({ 
  data, 
  labels, 
  color = "#6378ff", 
  height = 120, 
  showGrid = true,
  animated = true 
}: ProgressChartProps) {
  const maxValue = Math.max(...data, 1);
  const width = 100;
  const barWidth = width / data.length * 0.65;
  const gap = width / data.length * 0.35;

  // Generate gradient colors
  const getGradientColor = (value: number, index: number) => {
    const intensity = value / maxValue;
    if (intensity > 0.8) return color;
    if (intensity > 0.5) return `${color}dd`;
    if (intensity > 0.3) return `${color}99`;
    return `${color}66`;
  };

  return (
    <div className="w-full">
      <div className="relative" style={{ height: `${height}px` }}>
        {/* Grid lines */}
        {showGrid && (
          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="absolute inset-0 w-full">
            {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
              <line
                key={fraction}
                x1="0"
                y1={height - 10 - (height - 20) * fraction}
                x2={width}
                y2={height - 10 - (height - 20) * fraction}
                stroke="rgba(99,120,255,0.1)"
                strokeWidth="0.5"
              />
            ))}
          </svg>
        )}
        
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="w-full">
          {/* Define gradients */}
          <defs>
            <linearGradient id={`bar-gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {data.map((value, index) => {
            const barHeight = (value / maxValue) * (height - 20);
            const x = index * (barWidth + gap) + gap/2;
            const y = height - barHeight - 10;
            const barColor = getGradientColor(value, index);
            
            return (
              <g key={index} className={animated ? "animate-in fade-in slide-in-from-bottom" : ""} 
                 style={{ animationDelay: `${index * 50}ms` }}>
                {/* Shadow/glow effect */}
                {value > 0 && (
                  <rect
                    x={x}
                    y={y - 1}
                    width={barWidth}
                    height={barHeight + 2}
                    fill={color}
                    opacity="0.2"
                    rx="3"
                    filter="url(#glow)"
                  />
                )}
                
                {/* Main bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={value > 0 ? `url(#bar-gradient-${color.replace('#', '')})` : "rgba(99,120,255,0.1)"}
                  rx="3"
                  className="transition-all hover:opacity-90 cursor-pointer"
                  style={{
                    filter: value > maxValue * 0.7 ? "url(#glow)" : "none",
                    transform: "transform-origin bottom"
                  }}
                />
                
                {/* Value label */}
                {value > 0 && (
                  <text
                    x={x + barWidth/2}
                    y={y - 4}
                    textAnchor="middle"
                    fill={color}
                    fontSize="9"
                    fontWeight="600"
                    className="transition-all"
                  >
                    {value >= 60 ? `${Math.floor(value/60)}h` : `${value}m`}
                  </text>
                )}
                
                {/* Hover indicator */}
                {value > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill="transparent"
                    rx="3"
                    className="hover:fill-white hover:opacity-10 transition-all cursor-pointer"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      
      {/* X-axis labels */}
      <div className="flex justify-between mt-2" style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: '500' }}>
        {labels.map((label, index) => (
          <span key={index} className="text-center flex-1" style={{ maxWidth: `${width/data.length}px` }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

interface PieChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
  showPercentages?: boolean;
  animated?: boolean;
  innerRadius?: number;
}

export function PieChart({ 
  data, 
  size = 140, 
  showPercentages = true,
  animated = true,
  innerRadius = 0.4 
}: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90; // Start from top

  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const outerRadius = 45;
    const innerRadiusValue = outerRadius * innerRadius;
    
    const x1Outer = 50 + outerRadius * Math.cos(startAngleRad);
    const y1Outer = 50 + outerRadius * Math.sin(startAngleRad);
    const x2Outer = 50 + outerRadius * Math.cos(endAngleRad);
    const y2Outer = 50 + outerRadius * Math.sin(endAngleRad);
    
    const x1Inner = 50 + innerRadiusValue * Math.cos(startAngleRad);
    const y1Inner = 50 + innerRadiusValue * Math.sin(startAngleRad);
    const x2Inner = 50 + innerRadiusValue * Math.cos(endAngleRad);
    const y2Inner = 50 + innerRadiusValue * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;
    
    // Create donut segment path
    const path = `
      M ${x1Outer} ${y1Outer}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}
      L ${x2Inner} ${y2Inner}
      A ${innerRadiusValue} ${innerRadiusValue} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}
      Z
    `;

    return {
      path,
      label: item.label,
      value: item.value,
      color: item.color,
      percentage,
      index
    };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <svg width={size} height={size} viewBox="0 0 100 100" className="flex-shrink-0">
          {/* Drop shadow */}
          <defs>
            <filter id="pie-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="1" result="offsetblur"/>
              <feFlood floodColor="#000000" floodOpacity="0.1"/>
              <feComposite in2="offsetblur" operator="in"/>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {segments.map((segment) => (
            <g key={segment.index} className={animated ? "animate-in fade-in zoom-in-95" : ""} 
               style={{ animationDelay: `${segment.index * 100}ms` }}>
              <path
                d={segment.path}
                fill={segment.color}
                opacity="0.95"
                filter="url(#pie-shadow)"
                className="transition-all hover:opacity-100 hover:scale-105 cursor-pointer"
                style={{ transformOrigin: '50px 50px' }}
              />
            </g>
          ))}
          
          {/* Center text */}
          {total > 0 && (
            <text x="50" y="45" textAnchor="middle" className="text-lg font-bold" style={{ fill: 'var(--text)' }}>
              {Math.round(total / 60)}h
            </text>
          )}
          {total > 0 && (
            <text x="50" y="58" textAnchor="middle" className="text-xs" style={{ fill: 'var(--muted)' }}>
              Total
            </text>
          )}
        </svg>
      </div>
      
      <div className="flex flex-col gap-2 text-xs">
        {segments.map((segment) => (
          <div key={segment.index} className="flex items-center gap-3 group">
            <div 
              className="w-4 h-4 rounded-sm shadow-sm transition-all group-hover:scale-110" 
              style={{ backgroundColor: segment.color }}
            />
            <div className="flex-1">
              <div className="font-medium" style={{ color: 'var(--text)' }}>
                {segment.label}
              </div>
              <div className="flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                <span>{Math.round(segment.value / 60)}h {segment.value % 60 > 0 ? `${segment.value % 60}m` : ''}</span>
                {showPercentages && (
                  <span className="text-xs opacity-75">({segment.percentage.toFixed(1)}%)</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TrendLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  showPoints?: boolean;
  smooth?: boolean;
  animated?: boolean;
}

export function TrendLine({ 
  data, 
  width = 200, 
  height = 80, 
  color = "#22d3a5",
  showArea = true,
  showPoints = true,
  smooth = true,
  animated = true
}: TrendLineProps) {
  if (data.length < 2) return null;

  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const range = maxValue - minValue || 1;

  // Generate smooth curve points
  const generateSmoothPath = (points: string[]) => {
    if (!smooth || points.length < 3) return points.join(' L ');
    
    const coords = points.map(p => p.split(',').map(Number));
    let path = `M ${coords[0][0]},${coords[0][1]}`;
    
    for (let i = 0; i < coords.length - 1; i++) {
      const xMid = (coords[i][0] + coords[i + 1][0]) / 2;
      const yMid = (coords[i][1] + coords[i + 1][1]) / 2;
      const cp1x = (xMid + coords[i][0]) / 2;
      const cp2x = (xMid + coords[i + 1][0]) / 2;
      
      path += ` Q ${cp1x},${coords[i][1]} ${xMid},${yMid}`;
      path += ` Q ${cp2x},${coords[i + 1][1]} ${coords[i + 1][0]},${coords[i + 1][1]}`;
    }
    
    return path;
  };

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - minValue) / range) * height;
    return `${x},${y}`;
  });

  const pathData = generateSmoothPath(points);
  const areaPoints = showArea ? `${pathData} L ${width},${height} L 0,${height} Z` : '';

  return (
    <div className="relative">
      <svg width={width} height={height} className="w-full">
        <defs>
          <linearGradient id={`area-gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="50%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
          <filter id="line-glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            y1={height * (1 - fraction)}
            x2={width}
            y2={height * (1 - fraction)}
            stroke="rgba(99,120,255,0.08)"
            strokeWidth="0.5"
            strokeDasharray="2,2"
          />
        ))}
        
        {/* Area fill */}
        {showArea && (
          <path
            d={areaPoints}
            fill={`url(#area-gradient-${color.replace('#', '')})`}
            className={animated ? "animate-in fade-in" : ""}
          />
        )}
        
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#line-glow)"
          className={animated ? "animate-in slide-in-from-left" : ""}
          style={{ animationDuration: '1s' }}
        />
        
        {/* Data points */}
        {showPoints && data.map((value, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((value - minValue) / range) * height;
          const isPeak = index > 0 && index < data.length - 1 && 
                        value > data[index - 1] && value > data[index + 1];
          
          return (
            <g key={index} className={animated ? "animate-in zoom-in-95" : ""} 
               style={{ animationDelay: `${index * 100}ms` }}>
              {/* Outer glow */}
              {isPeak && (
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill={color}
                  opacity="0.2"
                  className="animate-pulse"
                />
              )}
              
              {/* Main point */}
              <circle
                cx={x}
                cy={y}
                r={isPeak ? "5" : "4"}
                fill="white"
                stroke={color}
                strokeWidth="2"
                className="transition-all hover:r-5 cursor-pointer"
              />
              
              {/* Value label for peaks */}
              {isPeak && (
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  fill={color}
                  fontSize="9"
                  fontWeight="600"
                >
                  {value >= 60 ? `${Math.floor(value/60)}h` : `${value}m`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface GoalRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  value?: string;
  animated?: boolean;
  showBackground?: boolean;
}

export function GoalRing({ 
  percentage, 
  size = 90, 
  strokeWidth = 10, 
  color = "#6378ff",
  label,
  value,
  animated = true,
  showBackground = true
}: GoalRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  // Determine color based on percentage
  const getProgressColor = () => {
    if (percentage >= 80) return "#22d3a5";
    if (percentage >= 50) return "#f59e0b";
    return "#ef4444";
  };
  
  const progressColor = color || getProgressColor();

  return (
    <div className="flex flex-col items-center group">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            <linearGradient id={`ring-gradient-${progressColor.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={progressColor} stopOpacity="1" />
              <stop offset="100%" stopColor={progressColor} stopOpacity="0.8" />
            </linearGradient>
            <filter id="ring-glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Background ring */}
          {showBackground && (
            <circle
              cx={size/2}
              cy={size/2}
              r={radius}
              stroke="rgba(99,120,255,0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
          )}
          
          {/* Progress ring */}
          <circle
            cx={size/2}
            cy={size/2}
            r={radius}
            stroke={`url(#ring-gradient-${progressColor.replace('#', '')})`}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={animated ? circumference : strokeDashoffset}
            strokeLinecap="round"
            filter={percentage > 70 ? "url(#ring-glow)" : "none"}
            className="transition-all"
            style={{
              animation: animated ? 'progress-ring 1s ease-out forwards' : 'none',
              '--stroke-dashoffset': strokeDashoffset
            } as React.CSSProperties}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center -mt-1">
          <span className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            {value || `${Math.round(percentage)}%`}
          </span>
          {label && (
            <span className="text-xs text-center px-2" style={{ color: 'var(--muted)' }}>
              {label}
            </span>
          )}
        </div>
        
        {/* Hover effect */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent group-hover:border-white group-hover:border-opacity-20 transition-all" />
      </div>
      
      <style jsx>{`
        @keyframes progress-ring {
          to {
            stroke-dashoffset: var(--stroke-dashoffset);
          }
        }
      `}</style>
    </div>
  );
}
