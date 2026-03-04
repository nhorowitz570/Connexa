"use client"

import { Calendar, Download } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"

const data = [
  { date: "Jan 1", runs: 3 }, { date: "Jan 8", runs: 5 }, { date: "Jan 15", runs: 4 },
  { date: "Jan 22", runs: 7 }, { date: "Jan 29", runs: 6 }, { date: "Feb 5", runs: 8 },
  { date: "Feb 12", runs: 5 }, { date: "Feb 19", runs: 9 }, { date: "Feb 26", runs: 7 },
  { date: "Mar 5", runs: 11 }, { date: "Mar 12", runs: 8 }, { date: "Mar 19", runs: 10 },
  { date: "Mar 26", runs: 12 }, { date: "Apr 2", runs: 9 }, { date: "Apr 9", runs: 14 },
  { date: "Apr 16", runs: 11 }, { date: "Apr 23", runs: 13 }, { date: "Apr 30", runs: 15 },
  { date: "May 7", runs: 12 }, { date: "May 14", runs: 16 }, { date: "May 21", runs: 14 },
  { date: "May 28", runs: 18 }, { date: "Jun 4", runs: 15 }, { date: "Jun 11", runs: 17 },
  { date: "Jun 18", runs: 20 }, { date: "Jun 25", runs: 16 }, { date: "Jul 2", runs: 19 },
  { date: "Jul 9", runs: 22 }, { date: "Jul 16", runs: 18 }, { date: "Jul 23", runs: 21 },
]

export function PerformanceChart() {
  return (
    <div className="flex flex-col gap-6 p-6 bg-[#0D0D0D] rounded-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-2 lg:gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-medium text-white">Discovery Pipeline Activity</h2>
        </div>
        
        <div className="flex items-center gap-4 md:gap-2 lg:gap-4">
          <div className="flex items-center bg-[#1A1A1A] rounded-lg p-1">
            {['7D', '30D', '90D'].map((period) => (
              <button
                key={period}
                className={`px-3 md:px-2 lg:px-3 py-1 text-sm md:text-xs lg:text-sm rounded-md transition-colors ${
                  period === '30D' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-white bg-[#1A1A1A] rounded-lg transition-colors">
              <Calendar className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-white bg-[#1A1A1A] rounded-lg transition-colors">
              <Download className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-gray-400">Active Runs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Brief Activity (Last 30 Days)</span>
        </div>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
            <XAxis 
              dataKey="date" 
              hide 
            />
            <YAxis 
              domain={[0, 25]} 
              orientation="left" 
              tick={{ fill: '#666' }} 
              axisLine={false}
              tickLine={false}
              ticks={[0, 5, 10, 15, 20, 25]}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#1A1A1A] border border-[#333] p-2 rounded-lg shadow-xl">
                      <p className="text-white font-medium">
                        {payload[0].value} runs <span className="text-gray-400 text-sm ml-2">{payload[0].payload.date}</span>
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            
            <Area 
              type="monotone" 
              dataKey="runs" 
              stroke="#6366f1" 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#colorRuns)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
