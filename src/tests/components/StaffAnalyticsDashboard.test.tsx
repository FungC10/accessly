import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StaffAnalyticsDashboard } from '@/components/admin/StaffAnalyticsDashboard'
import type { StaffAnalyticsResponse } from '@/app/api/admin/staff-analytics/logic'

describe('StaffAnalyticsDashboard', () => {
  const mockDataWithStaff: StaffAnalyticsResponse = {
    staff: [
      {
        userId: 'admin-1',
        name: 'John Doe',
        email: 'john@example.com',
        totalTicketsAssigned: 25,
        activeTickets: 5,
        avgResponseTimeMinutes: 15,
        ticketMessagesLast30d: 42,
        resolutionRate: 0.85,
      },
      {
        userId: 'admin-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        totalTicketsAssigned: 18,
        activeTickets: 12,
        avgResponseTimeMinutes: 30,
        ticketMessagesLast30d: 28,
        resolutionRate: 0.72,
      },
      {
        userId: 'admin-3',
        name: 'Bob Wilson',
        email: 'bob@example.com',
        totalTicketsAssigned: 10,
        activeTickets: 0,
        avgResponseTimeMinutes: null,
        ticketMessagesLast30d: 5,
        resolutionRate: null,
      },
    ],
    ticketsByDepartment: {
      IT_SUPPORT: 15,
      BILLING: 8,
      PRODUCT: 12,
      GENERAL: 20,
      total: 55,
    },
  }

  const mockDataEmpty: StaffAnalyticsResponse = {
    staff: [],
    ticketsByDepartment: {
      IT_SUPPORT: 0,
      BILLING: 0,
      PRODUCT: 0,
      GENERAL: 0,
      total: 0,
    },
  }

  const mockDataNoDepartment: StaffAnalyticsResponse = {
    staff: [
      {
        userId: 'admin-1',
        name: 'John Doe',
        email: 'john@example.com',
        totalTicketsAssigned: 5,
        activeTickets: 2,
        avgResponseTimeMinutes: 20,
        ticketMessagesLast30d: 10,
        resolutionRate: 0.8,
      },
    ],
  }

  it('should render department summary when provided', () => {
    render(<StaffAnalyticsDashboard data={mockDataWithStaff} />)

    expect(screen.getByText('Tickets by Department')).toBeInTheDocument()
    expect(screen.getByText('IT Support')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument() // IT_SUPPORT count
    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument() // BILLING count
    expect(screen.getByText('Product')).toBeInTheDocument()
    // Product count (12) - use getAllByText since 12 appears in both Product and Jane's active tickets
    const productCounts = screen.getAllByText('12')
    expect(productCounts.length).toBeGreaterThanOrEqual(1)
    // Verify Product section has 12
    const productLabel = screen.getByText('Product')
    const productSection = productLabel.closest('div')?.parentElement
    expect(productSection).toHaveTextContent('12')
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument() // GENERAL count
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('55')).toBeInTheDocument() // Total count
  })

  it('should render staff table with all staff members', () => {
    render(<StaffAnalyticsDashboard data={mockDataWithStaff} />)

    expect(screen.getByText('Staff Load & Performance')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('should display correct metrics for each staff member', () => {
    render(<StaffAnalyticsDashboard data={mockDataWithStaff} />)

    // Check John Doe's metrics
    const johnRow = screen.getByText('John Doe').closest('tr')
    expect(johnRow).toBeInTheDocument()
    expect(johnRow).toHaveTextContent('25') // totalTicketsAssigned
    expect(johnRow).toHaveTextContent('5') // activeTickets
    expect(johnRow).toHaveTextContent('15 min') // avgResponseTimeMinutes
    expect(johnRow).toHaveTextContent('42') // ticketMessagesLast30d
    expect(johnRow).toHaveTextContent('85%') // resolutionRate (0.85 * 100)

    // Check Jane Smith's metrics
    const janeRow = screen.getByText('Jane Smith').closest('tr')
    expect(janeRow).toBeInTheDocument()
    expect(janeRow).toHaveTextContent('18') // totalTicketsAssigned
    expect(janeRow).toHaveTextContent('12') // activeTickets (should be yellow)
    expect(janeRow).toHaveTextContent('30 min') // avgResponseTimeMinutes
    expect(janeRow).toHaveTextContent('28') // ticketMessagesLast30d
    expect(janeRow).toHaveTextContent('72%') // resolutionRate

    // Check Bob Wilson's metrics (with null values)
    const bobRow = screen.getByText('Bob Wilson').closest('tr')
    expect(bobRow).toBeInTheDocument()
    expect(bobRow).toHaveTextContent('10') // totalTicketsAssigned
    expect(bobRow).toHaveTextContent('0') // activeTickets
    expect(bobRow).toHaveTextContent('—') // avgResponseTimeMinutes (null)
    expect(bobRow).toHaveTextContent('5') // ticketMessagesLast30d
    expect(bobRow).toHaveTextContent('—') // resolutionRate (null)
  })

  it('should display empty state when no staff members', () => {
    render(<StaffAnalyticsDashboard data={mockDataEmpty} />)

    expect(
      screen.getByText('No staff analytics available yet.')
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Create some tickets and assign them to admins to see data here.'
      )
    ).toBeInTheDocument()
  })

  it('should handle missing ticketsByDepartment gracefully', () => {
    render(<StaffAnalyticsDashboard data={mockDataNoDepartment} />)

    // Should still render staff table
    expect(screen.getByText('Staff Load & Performance')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()

    // Department summary should not be rendered
    expect(screen.queryByText('Tickets by Department')).not.toBeInTheDocument()
  })

  it('should display table headers with tooltips', () => {
    render(<StaffAnalyticsDashboard data={mockDataWithStaff} />)

    const totalTicketsHeader = screen.getByText('Total Tickets')
    expect(totalTicketsHeader).toBeInTheDocument()
    expect(totalTicketsHeader).toHaveAttribute(
      'title',
      'Total number of tickets assigned to this staff member (all time)'
    )

    const activeTicketsHeader = screen.getByText('Active Tickets')
    expect(activeTicketsHeader).toBeInTheDocument()
    expect(activeTicketsHeader).toHaveAttribute(
      'title',
      'Currently open or waiting tickets assigned to this staff member'
    )

    const avgResponseHeader = screen.getByText('Avg Response')
    expect(avgResponseHeader).toBeInTheDocument()
    expect(avgResponseHeader).toHaveAttribute(
      'title',
      'Average time to respond to customer messages (in minutes). Calculated from customer message to staff response.'
    )

    const messagesHeader = screen.getByText('Messages (30d)')
    expect(messagesHeader).toBeInTheDocument()
    expect(messagesHeader).toHaveAttribute(
      'title',
      'Number of messages sent by this staff member in ticket rooms over the last 30 days'
    )

    const resolutionRateHeader = screen.getByText('Resolution Rate')
    expect(resolutionRateHeader).toBeInTheDocument()
    expect(resolutionRateHeader).toHaveAttribute(
      'title',
      'Percentage of tickets resolved out of all tickets with OPEN, WAITING, or RESOLVED status'
    )
  })

  it('should display info icons with tooltips', () => {
    render(<StaffAnalyticsDashboard data={mockDataWithStaff} />)

    // Check for info icons (ℹ️ emoji)
    const infoIcons = screen.getAllByText('ℹ️')
    expect(infoIcons.length).toBeGreaterThan(0)

    // Check tooltip on department summary
    const deptInfo = infoIcons.find((icon) =>
      icon.closest('div')?.textContent?.includes('Tickets by Department')
    )
    expect(deptInfo).toBeInTheDocument()
    expect(deptInfo).toHaveAttribute(
      'title',
      'Total number of tickets grouped by department (all time)'
    )

    // Check tooltip on staff performance section
    const staffInfo = infoIcons.find((icon) =>
      icon.closest('div')?.textContent?.includes('Staff Load & Performance')
    )
    expect(staffInfo).toBeInTheDocument()
    expect(staffInfo).toHaveAttribute(
      'title',
      'Metrics for all staff members (admins). Hover over column headers for detailed explanations.'
    )
  })

  it('should apply correct color coding for active tickets', () => {
    render(<StaffAnalyticsDashboard data={mockDataWithStaff} />)

    // John has 5 active tickets (should be green)
    const johnRow = screen.getByText('John Doe').closest('tr')
    const johnActiveTickets = johnRow?.querySelector('span.text-green-400')
    expect(johnActiveTickets).toHaveTextContent('5')

    // Jane has 12 active tickets (should be yellow)
    const janeRow = screen.getByText('Jane Smith').closest('tr')
    const janeActiveTickets = janeRow?.querySelector('span.text-yellow-400')
    expect(janeActiveTickets).toHaveTextContent('12')

    // Bob has 0 active tickets (should be slate)
    const bobRow = screen.getByText('Bob Wilson').closest('tr')
    const bobActiveTickets = bobRow?.querySelector('span.text-slate-400')
    expect(bobActiveTickets).toHaveTextContent('0')
  })

  it('should handle staff with only email (no name)', () => {
    const dataWithEmailOnly: StaffAnalyticsResponse = {
      staff: [
        {
          userId: 'admin-1',
          name: 'Unknown',
          email: 'admin@example.com',
          totalTicketsAssigned: 5,
          activeTickets: 2,
          avgResponseTimeMinutes: 10,
          ticketMessagesLast30d: 8,
          resolutionRate: 0.9,
        },
      ],
      ticketsByDepartment: {
        IT_SUPPORT: 5,
        BILLING: 0,
        PRODUCT: 0,
        GENERAL: 0,
        total: 5,
      },
    }

    render(<StaffAnalyticsDashboard data={dataWithEmailOnly} />)

    // Should display email when name is "Unknown"
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
  })
})

