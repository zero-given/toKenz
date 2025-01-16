import { Component, createEffect } from 'solid-js';
import { Line as Chart } from 'solid-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  TimeScale,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  TimeScale,
  Filler
);

import type { Token } from '../types';

interface ChartProps {
  token: Token;
  history: any[];
  type: 'liquidity' | 'holders';
  height?: number;
}

export const TokenChart: Component<ChartProps> = (props) => {
  const chartData = () => {
    if (!props.history?.length) return null;

    const data = props.history.map(record => ({
      x: new Date(record.timestamp),
      y: props.type === 'liquidity' ? record.totalLiquidity : record.holderCount
    }));

    return {
      datasets: [{
        label: props.type === 'liquidity' ? 'Liquidity ($)' : 'Holders',
        data: data,
        borderColor: props.type === 'liquidity' ? '#3182CE' : '#805AD5',
        backgroundColor: props.type === 'liquidity' ? '#3182CE33' : '#805AD533',
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
        pointBackgroundColor: props.type === 'liquidity' ? '#3182CE' : '#805AD5',
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
      }]
    };
  };

  const getYAxisConfig = () => {
    if (!props.history?.length) return {};

    const values = props.history.map(record => 
      props.type === 'liquidity' ? record.totalLiquidity : record.holderCount
    );
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;

    // Add padding to the range
    const paddingFactor = 0.1; // 10% padding
    const paddedMin = Math.max(0, min - (range * paddingFactor));
    const paddedMax = max + (range * paddingFactor);

    return {
      min: paddedMin,
      max: paddedMax,
      ticks: {
        count: 6, // More tick marks for better granularity
        color: '#9CA3AF',
        font: { size: 11 },
        callback: (value: number) => {
          if (props.type === 'liquidity') {
            // Use K/M/B notation for large numbers
            if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
            if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
            if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
            return `$${value.toFixed(0)}`;
          }
          return value.toLocaleString();
        }
      }
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart'
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 12,
        titleColor: '#fff',
        titleFont: {
          size: 13,
          weight: 'bold'
        },
        bodyFont: {
          size: 12
        },
        callbacks: {
          label: (context: any) => {
            const value = context.raw.y;
            return props.type === 'liquidity' 
              ? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : value.toLocaleString();
          },
          title: (tooltipItems: any[]) => {
            const date = new Date(tooltipItems[0].raw.x);
            return date.toLocaleString();
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm'
          }
        },
        grid: {
          display: true,
          color: 'rgba(75,85,99,0.1)'
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          color: '#9CA3AF',
          font: {
            size: 11
          }
        }
      },
      y: {
        ...getYAxisConfig(),
        grid: {
          display: true,
          color: 'rgba(75,85,99,0.1)'
        }
      }
    }
  };

  return (
    <div class="w-full h-full">
      {chartData() && (
        <Chart 
          type="line"
          data={chartData()}
          options={options}
          width={props.height || 200}
          height={props.height || 200}
        />
      )}
    </div>
  );
};

// For backward compatibility
export const TokenLiquidityChart: Component<{ token: Token; history: any[] }> = (props) => (
  <TokenChart token={props.token} history={props.history} type="liquidity" />
); 