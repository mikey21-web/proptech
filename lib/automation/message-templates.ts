export interface MessageTemplate {
  id: string;
  key: string;
  name: string;
  category: 'booking' | 'payment' | 'followup' | 'notification' | 'report';
  template: string;
  variables: string[]; // e.g., ['customerName', 'bookingNumber']
  isActive: boolean;
}

export const DEFAULT_TEMPLATES: Record<string, MessageTemplate> = {
  booking_confirmation: {
    id: 'tpl_booking_confirmation',
    key: 'booking_confirmation',
    name: 'Booking Confirmation',
    category: 'booking',
    template: `🎉 Congratulations {customerName}!

Your booking for {projectName} - Plot {plotNumber} is confirmed!

📋 Booking Details:
• Booking ID: {bookingNumber}
• Property: {plotNumber}, {projectName}
• Total Amount: Rs {totalAmount}
• Booking Date: {bookingDate}

🔑 Portal Access:
Login to your customer portal to view your installments and payment history:
{portalLink}

Username: {email}
Password: {temporaryPassword}

📞 For support, contact: {supportPhone}

Thank you for choosing us!`,
    variables: [
      'customerName',
      'projectName',
      'plotNumber',
      'bookingNumber',
      'totalAmount',
      'bookingDate',
      'portalLink',
      'email',
      'temporaryPassword',
      'supportPhone',
    ],
    isActive: true,
  },

  payment_reminder: {
    id: 'tpl_payment_reminder',
    key: 'payment_reminder',
    name: '3-Day Payment Reminder',
    category: 'payment',
    template: `⏰ Payment Reminder for {bookingNumber}

Hi {customerName},

Your installment #{installmentNo} is due in 3 days!

💰 Payment Details:
• Project: {projectName}
• Amount Due: Rs {dueAmount}
• Due Date: {dueDate}
• Installment: {installmentNo} of {totalInstallments}

💳 You can pay via:
• UPI
• Bank Transfer
• Cheque
• Cash

📍 Payment Portal: {portalLink}

Please arrange payment before the due date to avoid late fees.

Need help? Contact us at {supportPhone}`,
    variables: [
      'bookingNumber',
      'customerName',
      'installmentNo',
      'projectName',
      'dueAmount',
      'dueDate',
      'totalInstallments',
      'portalLink',
      'supportPhone',
    ],
    isActive: true,
  },

  installment_overdue: {
    id: 'tpl_installment_overdue',
    key: 'installment_overdue',
    name: 'Installment Overdue Notice',
    category: 'payment',
    template: `⚠️ Payment Overdue - {bookingNumber}

Dear {customerName},

Your installment #{installmentNo} for "{projectName}" is now OVERDUE by {daysOverdue} days.

📊 Overdue Details:
• Amount: Rs {dueAmount}
• Original Due Date: {originalDueDate}
• Days Overdue: {daysOverdue}
• Late Fee (if applicable): Rs {lateFee}

⏳ Action Required:
Please make the payment immediately to:
1. Avoid legal action
2. Prevent project suspension
3. Avoid additional late fees

💳 Payment Methods: {paymentPortalLink}

Contact us immediately at {supportPhone} if there are any issues.

Regards,
{agencyName}`,
    variables: [
      'bookingNumber',
      'customerName',
      'installmentNo',
      'projectName',
      'daysOverdue',
      'dueAmount',
      'originalDueDate',
      'lateFee',
      'paymentPortalLink',
      'supportPhone',
      'agencyName',
    ],
    isActive: true,
  },

  lead_followup: {
    id: 'tpl_lead_followup',
    key: 'lead_followup',
    name: 'Lead Follow-up Reminder',
    category: 'followup',
    template: `Hi {agentName},

📌 Reminder: Lead {leadName} hasn't been contacted for {daysSinceLast} days.

👤 Lead Details:
• Name: {leadName}
• Phone: {leadPhone}
• Last Contact: {lastContact}
• Status: {leadStatus}
• Priority: {priority}

⚡ Next Step:
Please reach out to {leadName} and schedule a:
• Site visit
• Property demo
• Consultation

💡 Tip: Higher engagement increases conversion chances!

Reach out now: {leadContactLink}`,
    variables: [
      'agentName',
      'leadName',
      'daysSinceLast',
      'leadPhone',
      'lastContact',
      'leadStatus',
      'priority',
      'leadContactLink',
    ],
    isActive: true,
  },

  weekly_report: {
    id: 'tpl_weekly_report',
    key: 'weekly_report',
    name: 'Weekly Performance Report',
    category: 'report',
    template: `📊 Weekly Performance Report

Hi {managerName},

Here's your team's performance for the week of {reportPeriod}:

📈 Metrics:
• New Leads: {leadsCreated}
• Bookings Closed: {bookingsCreated}
• Payments Received: Rs {paymentsReceived}
• Activities: {activitiesCount}

🏆 Top Performer: {topAgent}

🎯 Opportunities:
• Overdue Payments: {overdueCount}
• Pending Leads: {pendingLeadsCount}
• Follow-ups Required: {followupCount}

💰 Revenue Impact:
• This Week: Rs {weeklyRevenue}
• Month-to-Date: Rs {monthlyRevenue}
• Year-to-Date: Rs {yearlyRevenue}

🔗 Full Report: {reportLink}`,
    variables: [
      'managerName',
      'reportPeriod',
      'leadsCreated',
      'bookingsCreated',
      'paymentsReceived',
      'activitiesCount',
      'topAgent',
      'overdueCount',
      'pendingLeadsCount',
      'followupCount',
      'weeklyRevenue',
      'monthlyRevenue',
      'yearlyRevenue',
      'reportLink',
    ],
    isActive: true,
  },
};

export function getTemplate(key: string): MessageTemplate | undefined {
  return DEFAULT_TEMPLATES[key];
}

export function renderTemplate(
  template: MessageTemplate | string,
  variables: Record<string, any>,
): string {
  let templateStr =
    typeof template === 'string' ? template : template.template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    templateStr = templateStr.replace(
      new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      String(value || ''),
    );
  }

  // Replace any remaining placeholders with empty string
  templateStr = templateStr.replace(/\{[^}]+\}/g, '');

  return templateStr;
}

export function extractVariables(template: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1]);
  }

  return [...new Set(matches)]; // Remove duplicates
}
