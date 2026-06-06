import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import apiClient from '@/lib/apiClient'
import type { DriverEarning } from '@/types/api'
import { CheckCircle, CreditCard } from 'lucide-react'
import { format } from 'date-fns'

type Tab = 'pending' | 'approved' | 'history'

function EarningRow({ earning, tab, onApprove, onPay }: any) {
  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-foreground">{earning.driver?.name}</td>
      <td className="px-4 py-3 text-xs text-muted">{earning.trip ? `${earning.trip.originName} → ${earning.trip.destinationName}` : '—'}</td>
      <td className="px-4 py-3 text-sm text-muted">{earning.distanceKm} km</td>
      <td className="px-4 py-3 text-sm text-foreground">{Number(earning.baseEarning).toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-green-600">+{Number(earning.bonus).toLocaleString()}</td>
      <td className="px-4 py-3 text-sm text-danger">-{Number(earning.penalty).toLocaleString()}</td>
      <td className="px-4 py-3 text-sm font-bold text-foreground">{Number(earning.totalEarning).toLocaleString()}</td>
      <td className="px-4 py-3 text-xs text-muted">{earning.createdAt ? format(new Date(earning.createdAt), 'dd/MM/yy') : '—'}</td>
      {tab === 'pending' && (
        <td className="px-4 py-3">
          <button onClick={() => onApprove(earning.id)}
            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors">
            Approve
          </button>
        </td>
      )}
      {tab === 'approved' && (
        <td className="px-4 py-3">
          <button onClick={() => onPay(earning.id)}
            className="px-3 py-1 bg-primary hover:bg-primary-dark text-white rounded text-xs font-medium transition-colors">
            Mark Paid
          </button>
        </td>
      )}
      {tab === 'history' && (
        <td className="px-4 py-3 text-xs text-muted">{earning.paidAt ? format(new Date(earning.paidAt), 'dd/MM/yy') : '—'}</td>
      )}
    </tr>
  )
}

export default function PayrollPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('pending')

  const { data: pending = [] } = useQuery<DriverEarning[]>('payroll-pending', () => apiClient.get('/payroll/pending').then(r => r.data))
  const { data: approved = [] } = useQuery<DriverEarning[]>('payroll-approved', () => apiClient.get('/payroll/approved').then(r => r.data))
  const { data: history = [] } = useQuery<DriverEarning[]>('payroll-history', () => apiClient.get('/payroll/history').then(r => r.data))

  const approve = useMutation((id: string) => apiClient.patch(`/payroll/${id}/approve`),
    { onSuccess: () => { qc.invalidateQueries('payroll-pending'); qc.invalidateQueries('payroll-approved') } })
  const pay = useMutation((id: string) => apiClient.patch(`/payroll/${id}/pay`),
    { onSuccess: () => { qc.invalidateQueries('payroll-approved'); qc.invalidateQueries('payroll-history') } })

  const pendingTotal = pending.reduce((s: number, e: any) => s + Number(e.totalEarning), 0)
  const approvedTotal = approved.reduce((s: number, e: any) => s + Number(e.totalEarning), 0)

  const data = tab === 'pending' ? pending : tab === 'approved' ? approved : history
  const headers = ['Driver', 'Route', 'Distance', 'Base (ETB)', 'Bonus', 'Penalty', 'Total (ETB)', 'Date', 'Action']

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payroll</h1>
        <p className="text-sm text-muted mt-0.5">Driver earnings approval and payments</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-xs text-muted font-medium mb-1">Pending Approval</p>
          <p className="text-2xl font-bold text-foreground">ETB {pendingTotal.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">{pending.length} earnings</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-xs text-muted font-medium mb-1">Approved — Awaiting Payment</p>
          <p className="text-2xl font-bold text-foreground">ETB {approvedTotal.toLocaleString()}</p>
          <p className="text-xs text-muted mt-1">{approved.length} earnings</p>
        </div>
      </div>

      <div className="flex border-b border-border">
        {(['pending', 'approved', 'history'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-foreground'}`}>
            {t} {t === 'pending' ? `(${pending.length})` : t === 'approved' ? `(${approved.length})` : ''}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {headers.map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((e: any) => (
                <EarningRow key={e.id} earning={e} tab={tab}
                  onApprove={(id: string) => approve.mutate(id)}
                  onPay={(id: string) => pay.mutate(id)} />
              ))}
              {data.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-muted">
                  {tab === 'pending' ? 'No pending earnings' : tab === 'approved' ? 'No approved earnings awaiting payment' : 'No payment history'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
