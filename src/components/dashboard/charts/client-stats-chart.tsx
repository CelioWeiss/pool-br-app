
"use client"

import { TrendingUp, TrendingDown, Users } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer, Tooltip } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/components/ui/separator"


export interface ClientStatsData {
    month: string;
    newClients: number;
    inactiveClients: number;
}

interface ClientStatsChartProps {
    data: ClientStatsData[];
    isLoading: boolean;
    totalActive: number;
    totalInactive: number;
}

const chartConfig = {
  newClients: {
    label: "Novos Clientes",
    color: "hsl(var(--chart-1))",
  },
  inactiveClients: {
    label: "Clientes Inativados",
    color: "hsl(var(--chart-2))",
  },
}

export function ClientStatsChart({ data, isLoading, totalActive, totalInactive }: ClientStatsChartProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Estatísticas de Clientes</CardTitle>
        <CardDescription>Novos e inativos nos últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
         {isLoading ? (
             <div className="h-[150px] flex items-center justify-center">
                <Spinner />
            </div>
        ) : (
            <ChartContainer config={chartConfig} className="h-[150px] w-full">
            <BarChart accessibilityLayer data={data}>
                <CartesianGrid vertical={false} />
                <XAxis
                dataKey="month"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
                />
                <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="newClients" fill="var(--color-newClients)" radius={4} />
                <Bar dataKey="inactiveClients" fill="var(--color-inactiveClients)" radius={4} />
            </BarChart>
            </ChartContainer>
         )}
      </CardContent>
       <CardFooter className="flex-col items-start gap-2 text-sm pt-4">
        <div className="flex gap-2 font-medium leading-none">
            <Users className="h-4 w-4 text-muted-foreground" /> Total de Clientes Ativos: <span className="text-primary">{totalActive}</span>
        </div>
         <div className="flex gap-2 font-medium leading-none text-muted-foreground">
            <Users className="h-4 w-4" /> Total de Clientes Inativos: {totalInactive}
        </div>
      </CardFooter>
    </Card>
  )
}
