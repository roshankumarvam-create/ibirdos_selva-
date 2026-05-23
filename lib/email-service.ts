type SendEmailInput = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
};

type SendEmailResult = {
  success: boolean;
  messageId: string;
};

type FDAAlert = {
  title?: string;
  description?: string;
  link?: string;
  publishedAt?: string;
};

type LeadNotificationData = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  message?: string;
};

type OrderConfirmationData = {
  orderId?: string;
  customerName?: string;
  eventDate?: string;
  total?: number;
};

export const emailService = {
  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    console.log("Email service placeholder:", {
      to: input.to,
      subject: input.subject,
      html: input.html ?? null,
      text: input.text ?? null,
    });

    return {
      success: true,
      messageId: "local-placeholder",
    };
  },

  async sendSystemAlert(subject: string, message: string): Promise<void> {
    console.log("System alert email placeholder:", {
      subject,
      message,
    });
  },

  async sendFDAAlert(email: string, alerts: FDAAlert[]): Promise<void> {
    console.log("FDA alert email placeholder:", {
      email,
      alerts,
    });
  },

  async sendLeadNotification(data: LeadNotificationData): Promise<void> {
    console.log("Lead notification email placeholder:", data);
  },

  async sendOrderConfirmation(
    email: string,
    order: OrderConfirmationData,
  ): Promise<void> {
    console.log("Order confirmation email placeholder:", {
      email,
      order,
    });
  },
};