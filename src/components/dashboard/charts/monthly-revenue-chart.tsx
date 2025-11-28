
"use client"

import { Area, AreaChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Spinner } from "@/components/ui/spinner"
import { TrendingUp } from "lucide-react"

export interface MonthlyRevenueData {
    month: string;
    revenue: number;
}

interface MonthlyRevenueChartProps {
    data: MonthlyRevenueData[];
    isLoading: boolean;
}

const chartConfig = {
  revenue: {
    label: "Faturamento",
    color: "hsl(var(--chart-1))",
  },
}

export function MonthlyRevenueChart({ data, isLoading }: MonthlyRevenueChartProps) {

  const totalRevenue = data.reduce((acc, item) => acc + item.revenue, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
            <div>
                <CardTitle>Faturamento Mensal</CardTitle>
                <CardDescription>Faturamento dos últimos 6 meses</CardDescription>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Total: {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
             <div className="h-[250px] flex items-center justify-center">
                <Spinner />
            </div>
        ) : (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <AreaChart
                    accessibilityLayer
                    data={data}
                    margin={{
                        left: 12,
                        right: 12,
                    }}
                >
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <Tooltip
                        cursor={false}
                        content={<ChartTooltipContent 
                            indicator="dot" 
                            formatter={(value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        />}
                    />
                    <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop
                        offset="5%"
                        stopColor="var(--color-revenue)"
                        stopOpacity={0.8}
                        />
                        <stop
                        offset="95%"
                        stopColor="var(--color-revenue)"
                        stopOpacity={0.1}
                        />
                    </linearGradient>
                    </defs>
                    <Area
                    dataKey="revenue"
                    type="natural"
                    fill="url(#fillRevenue)"
                    fillOpacity={0.4}
                    stroke="var(--color-revenue)"
                    stackId="a"
                    />
                </AreaChart>
            </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
