"use client"

import type { ReactNode } from "react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  type TooltipContentProps,
} from "recharts"

interface ChartDatapoint {
  [key: string]: unknown
}

interface ChartSeries {
  type: string
  data: ChartDatapoint[]
}

interface ProgressChartProps {
  hasActiveFilter: boolean
  filteredChartData: ChartSeries[]
  aggregateChartData: ChartDatapoint[]
  displayNames: Record<string, string>
  examColor: (type: string) => string
  renderTooltip: (props: TooltipContentProps) => ReactNode
}

export function ProgressChart({
  hasActiveFilter,
  filteredChartData,
  aggregateChartData,
  displayNames,
  examColor,
  renderTooltip,
}: ProgressChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      {hasActiveFilter ? (
        <LineChart margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--line)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
            axisLine={false}
            tickLine={false}
            allowDuplicatedCategory={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={renderTooltip} />
          {filteredChartData.map((series) => (
            <Line
              key={series.type}
              dataKey={series.type}
              data={series.data}
              type="monotone"
              stroke={examColor(series.type)}
              strokeWidth={2}
              dot={{ r: 3, fill: examColor(series.type), strokeWidth: 0 }}
              activeDot={{
                r: 5,
                fill: examColor(series.type),
                stroke: "var(--bg-raised)",
                strokeWidth: 2,
              }}
              connectNulls={false}
              name={displayNames[series.type]}
            />
          ))}
        </LineChart>
      ) : (
        <AreaChart
          data={aggregateChartData}
          margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
        >
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--line)"
            strokeOpacity={0.5}
          />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--ink-faint)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={renderTooltip} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#scoreGrad)"
            dot={{ r: 3.5, fill: "var(--accent)", strokeWidth: 0 }}
            activeDot={{
              r: 5,
              fill: "var(--accent)",
              stroke: "var(--bg-raised)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  )
}
