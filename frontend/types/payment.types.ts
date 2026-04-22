export type PaymentMethod = 'VNPAY' | 'MOMO' | 'ZALOPAY' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CASH';

export type PaymentStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export interface PaymentResponse {
  id: number;
  bookingId: number;
  bookingCode: string;
  paymentMethod: PaymentMethod;
  transactionId: string | null;
  amount: number;
  status: PaymentStatus;
  paymentDate: string | null; 
  createdAt: string;
  updatedAt: string;
}