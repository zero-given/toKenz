import { Component, createEffect, onCleanup } from 'solid-js';
import type { Token } from '../types';

interface TokenLiquidityChartProps {
  token: Token;
}

export const TokenLiquidityChart: Component<TokenLiquidityChartProps> = (props) => {
  let canvasRef: HTMLCanvasElement | undefined;
  
  const drawChart = () => {
    if (!canvasRef) return;
    
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    
    // Set dimensions
    const width = canvasRef.width;
    const height = canvasRef.height;
    const padding = 20;
    
    // Calculate liquidity data points
    const dataPoints = [
      props.token.hp_liquidity_amount
    ];
    
    if (dataPoints.length === 0) {
      ctx.fillStyle = '#6B7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No liquidity data available', width / 2, height / 2);
      return;
    }
    
    // Find min and max values
    const minValue = Math.min(...dataPoints);
    const maxValue = Math.max(...dataPoints);
    
    // Calculate scale
    const xScale = (width - padding * 2) / (dataPoints.length - 1);
    const yScale = (height - padding * 2) / (maxValue - minValue || 1);
    
    // Draw grid
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let i = 0; i < dataPoints.length; i++) {
      const x = padding + i * xScale;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (height - padding * 2) * (i / gridLines);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      
      // Draw y-axis labels
      const value = maxValue - ((maxValue - minValue) * (i / gridLines));
      ctx.fillStyle = '#6B7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`$${value.toFixed(2)}`, padding - 5, y + 4);
    }
    
    // Draw line chart
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    dataPoints.forEach((value, index) => {
      const x = padding + index * xScale;
      const y = height - padding - (value - minValue) * yScale;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw points
    ctx.fillStyle = '#8B5CF6';
    dataPoints.forEach((value, index) => {
      const x = padding + index * xScale;
      const y = height - padding - (value - minValue) * yScale;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  };
  
  // Set up resize observer
  createEffect(() => {
    if (!canvasRef) return;
    
    const observer = new ResizeObserver(() => {
      if (!canvasRef) return;
      
      // Set canvas size
      const rect = canvasRef.getBoundingClientRect();
      canvasRef.width = rect.width * window.devicePixelRatio;
      canvasRef.height = rect.height * window.devicePixelRatio;
      
      // Scale context
      const ctx = canvasRef.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      
      drawChart();
    });
    
    observer.observe(canvasRef);
    
    onCleanup(() => {
      observer.disconnect();
    });
  });
  
  return (
    <div class="w-full h-[200px] relative">
      <canvas
        ref={canvasRef}
        class="w-full h-full"
      />
    </div>
  );
}; 