// Shared types/contracts between core-service and the dashboard.

export type Environment = 'sandbox' | 'production';
export type Provider = 'midtrans';
export type PaymentMethod = 'qris' | 'gopay' | 'bank_transfer' | 'credit_card' | 'other';

export type PaymentLinkStatus = 'active' | 'inactive' | 'expired';
export type InvoiceStatus = 'pending' | 'paid' | 'expired' | 'cancelled';
export type TransactionStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';

export type WebhookEventType =
  | 'payment_link.paid'
  | 'invoice.paid'
  | 'invoice.expired'
  | 'transaction.failed';

// The signed payload actually delivered to a merchant's webhook URL.
export interface WebhookDeliveryPayload {
  id: string; // webhook_events.id
  type: WebhookEventType;
  createdAt: string;
  data: {
    transactionId: string;
    status: TransactionStatus;
    provider: Provider;
    paymentMethod: PaymentMethod | null;
    amount: string;
    currency: string;
    sourceType: 'payment_link' | 'invoice';
    sourceId: string;
  };
}
