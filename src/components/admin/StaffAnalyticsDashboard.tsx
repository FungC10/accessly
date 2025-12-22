'use client'

import type { StaffAnalyticsResponse } from '@/app/api/admin/staff-analytics/logic'

interface StaffAnalyticsDashboardProps {
  data: StaffAnalyticsResponse
}

export function StaffAnalyticsDashboard({ data }: StaffAnalyticsDashboardProps) {
  const { staff, ticketsByDepartment } = data

  // Department label mapping
  const departmentLabels: Record<string, string> = {
    IT_SUPPORT: 'IT Support',
    BILLING: 'Billing',
    PRODUCT: 'Product',
    GENERAL: 'General',
  }

  return (
    <div className="space-y-6">
      {/* Summary Card: Tickets by Department */}
      {ticketsByDepartment && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-3">
            Tickets by Department
            <span
              className="ml-2 text-xs text-slate-500 cursor-help"
              title="Total number of tickets grouped by department (all time)"
            >
              ℹ️
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(ticketsByDepartment)
              .filter(([key]) => key !== 'total')
              .map(([dept, count]) => (
                <div key={dept}>
                  <div className="text-xs text-slate-500 mb-1">
                    {departmentLabels[dept] || dept}
                  </div>
                  <div className="text-2xl font-bold text-purple-400">{count}</div>
                </div>
              ))}
            <div>
              <div className="text-xs text-slate-500 mb-1">Total</div>
              <div className="text-2xl font-bold text-cyan-400">
                {ticketsByDepartment.total}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Staff Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="text-sm text-slate-400 mb-3">
          Staff Load & Performance
          <span
            className="ml-2 text-xs text-slate-500 cursor-help"
            title="Metrics for all staff members (admins). Hover over column headers for detailed explanations."
          >
            ℹ️
          </span>
        </div>
        {staff.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p>No staff analytics available yet.</p>
            <p className="text-sm mt-2 text-slate-500">
              Create some tickets and assign them to admins to see data here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-slate-200">
              <thead className="text-xs uppercase text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="py-2 text-left px-2">Staff</th>
                  <th
                    className="py-2 text-right px-2 cursor-help"
                    title="Total number of tickets assigned to this staff member (all time)"
                  >
                    Total Tickets
                  </th>
                  <th
                    className="py-2 text-right px-2 cursor-help"
                    title="Currently open or waiting tickets assigned to this staff member"
                  >
                    Active Tickets
                  </th>
                  <th
                    className="py-2 text-right px-2 cursor-help"
                    title="Average time to respond to customer messages (in minutes). Calculated from customer message to staff response."
                  >
                    Avg Response
                  </th>
                  <th
                    className="py-2 text-right px-2 cursor-help"
                    title="Number of messages sent by this staff member in ticket rooms over the last 30 days"
                  >
                    Messages (30d)
                  </th>
                  <th
                    className="py-2 text-right px-2 cursor-help"
                    title="Percentage of tickets resolved out of all tickets with OPEN, WAITING, or RESOLVED status"
                  >
                    Resolution Rate
                  </th>
                </tr>
              </thead>
              <tbody>
                {staff.map((row) => (
                  <tr
                    key={row.userId}
                    className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div className="font-medium text-slate-200">
                        {row.name || row.email || 'Unknown'}
                      </div>
                      {row.email && row.name && (
                        <div className="text-xs text-slate-500 mt-0.5">{row.email}</div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300">
                      {row.totalTicketsAssigned}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={`font-semibold ${
                          row.activeTickets > 10
                            ? 'text-yellow-400'
                            : row.activeTickets > 0
                            ? 'text-green-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {row.activeTickets}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300">
                      {row.avgResponseTimeMinutes != null
                        ? `${row.avgResponseTimeMinutes} min`
                        : '—'}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300">
                      {row.ticketMessagesLast30d}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-300">
                      {row.resolutionRate != null
                        ? `${Math.round(row.resolutionRate * 100)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

