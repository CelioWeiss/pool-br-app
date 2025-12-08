
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
import { TrendingUp, TrendingDown } from "lucide-react"
import { useMemo } from "react"

export interface MonthlyRevenueData {
    month: string;
    faturado: number;
    recebido: number;
}

interface MonthlyRevenueChartProps {
    data: MonthlyRevenueData[];
    isLoading: boolean;
    isMaster?: boolean;
}

const chartConfig = {
  faturado: {
    label: "Faturado",
    color: "hsl(var(--chart-2))",
  },
  recebido: {
    label: "Recebido",
    color: "hsl(var(--chart-1))",
  },
}

export function MonthlyRevenueChart({ data, isLoading, isMaster = false }: MonthlyRevenueChartProps) {

  const totals = useMemo(() => {
    return data.reduce((acc, item) => {
        acc.faturado += item.faturado;
        acc.recebido += item.recebido;
        return acc;
    }, { faturado: 0, recebido: 0 });
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
            <div>
                <CardTitle>{isMaster ? "Faturamento Total (Todas Franquias)" : "Faturamento Mensal"}</CardTitle>
                <CardDescription>Faturado vs. Recebido nos últimos 6 meses</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm">
                 <div className="flex items-center gap-2 font-medium">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-recebido)' }} />
                    <span className="text-muted-foreground">Recebido:</span>
                    <span>{totals.recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                 <div className="flex items-center gap-2">
                     <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-faturado)' }} />
                    <span className="text-muted-foreground">Faturado:</span>
                    <span>{totals.faturado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
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
                        <linearGradient id="fillRecebido" x1="0" y1="0" x2="0" y2="1">
                            <stop
                            offset="5%"
                            stopColor="var(--color-recebido)"
                            stopOpacity={0.8}
                            />
                            <stop
                            offset="95%"
                            stopColor="var(--color-recebido)"
                            stopOpacity={0.1}
                            />
                        </linearGradient>
                         <linearGradient id="fillFaturado" x1="0" y1="0" x2="0" y2="1">
                            <stop
                            offset="5%"
                            stopColor="var(--color-faturado)"
                            stopOpacity={0.6}
                            />
                            <stop
                            offset="95%"
                            stopColor="var(--color-faturado)"
                            stopOpacity={0.05}
                            />
                        </linearGradient>
                    </defs>
                    <Area
                        dataKey="faturado"
                        type="natural"
                        fill="url(#fillFaturado)"
                        fillOpacity={0.4}
                        stroke="var(--color-faturado)"
                        stackId="a"
                    />
                    <Area
                        dataKey="recebido"
                        type="natural"
                        fill="url(#fillRecebido)"
                        fillOpacity={0.4}
                        stroke="var(--color-recebido)"
                        stackId="b"
                    />
                </AreaChart>
            </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
