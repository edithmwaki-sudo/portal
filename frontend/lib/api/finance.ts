import { apiClient } from "./client";

export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "M_PESA"
  | "CHEQUE"
  | "CARD"
  | "OTHER";

export type InvoiceStatus = "ISSUED" | "PARTIAL" | "PAID" | "CANCELLED";
export type PaymentStatus = "COMPLETED" | "REVERSED";
export type AdhocChargeType = "FINE" | "PENALTY" | "HOSTEL" | "OTHER";

export interface InvoiceItem {
  id: number;
  feeItemId: number | null;
  itemName: string;
  description: string | null;
  amount: number;
  quantity: number;
  totalAmount: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  studentId: number;
  studentName: string | null;
  studentAdmissionNumber: string | null;
  courseId: number | null;
  courseName: string | null;
  courseCode: string | null;
  curriculumId: number | null;
  curriculumName: string | null;
  academicYearId: number | null;
  academicYearName: string | null;
  academicSessionId: number | null;
  academicSessionName: string | null;
  feeStructureId: number | null;
  feeStructureName: string | null;
  type: string;
  chargeType: string | null;
  status: InvoiceStatus;
  amountDue: number;
  computedAmount: number;
  paidAmount: number;
  balance: number;
  issueDate: string;
  dueDate: string;
  notes: string | null;
  reason: string | null;
  reversedAt: string | null;
  reversedBy: number | null;
  createdAt: string;
  updatedAt: string;
  items?: InvoiceItem[];
}

export interface InvoiceListResponse {
  items: Invoice[];
  total: number;
  page: number;
  limit: number;
}

export interface PaymentAllocation {
  id: number;
  invoiceId: number;
  invoiceNumber: string | null;
  amount: number;
  allocatedAt: string;
}

export interface Payment {
  id: number;
  studentId: number | null;
  studentName: string | null;
  studentAdmissionNumber: string | null;
  academicSessionId: number | null;
  academicSessionName: string | null;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference: string | null;
  status: PaymentStatus;
  reversedAt: string | null;
  reversedBy: number | null;
  reversalReason: string | null;
  notes: string | null;
  createdAt: string;
  allocations?: PaymentAllocation[];
}

export interface PaymentListResponse {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
}

export interface InvoicePreviewLine {
  feeItemId: number;
  itemName: string;
  description: string | null;
  amount: number;
  quantity: number;
  totalAmount: number;
}

export interface InvoicePreview {
  studentId: number;
  academicSessionId: number | null;
  academicSessionName: string | null;
  feeStructureId: number | null;
  feeStructureName: string | null;
  dueDate: string | null;
  items: InvoicePreviewLine[];
  total: number;
}

export interface StudentStatement {
  student: {
    id: number;
    name: string | null;
    admissionNumber: string | null;
  };
  totals: {
    invoiced: number;
    paid: number;
    adjustments: number;
    balance: number;
    creditBalance: number;
    unallocated: number;
  };
  entries: {
    id: number;
    type: string;
    debit: number;
    credit: number;
    reference: string | null;
    description: string | null;
    transactionDate: string;
    createdAt: string;
  }[];
}

export interface CreatePaymentPayload {
  studentId: number;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface CreateAdhocLine {
  itemName: string;
  description?: string;
  amount: number;
  quantity?: number;
}

export interface CreateAdhocInvoicePayload {
  studentId: number;
  chargeType: AdhocChargeType;
  items: CreateAdhocLine[];
  dueDate?: string;
  notes?: string;
}

// ---------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: number;
  status?: string;
  type?: string;
  academicSessionId?: number;
  academicYearId?: number;
}

export async function getInvoices(
  filters: InvoiceFilters = {}
): Promise<InvoiceListResponse> {
  const { page = 1, limit = 25, ...rest } = filters;
  const response = await apiClient.get<InvoiceListResponse>("/invoices", {
    params: {
      page,
      limit,
      ...(rest.search ? { search: rest.search } : {}),
      ...(rest.studentId ? { studentId: rest.studentId } : {}),
      ...(rest.status ? { status: rest.status } : {}),
      ...(rest.type ? { type: rest.type } : {}),
      ...(rest.academicSessionId ? { academicSessionId: rest.academicSessionId } : {}),
      ...(rest.academicYearId ? { academicYearId: rest.academicYearId } : {}),
    },
  });
  return response.data;
}

export async function getInvoice(id: number): Promise<Invoice> {
  const response = await apiClient.get<Invoice>(`/invoices/${id}`);
  return response.data;
}

export async function issueInvoice(
  studentId: number
): Promise<Invoice> {
  const response = await apiClient.post<Invoice>("/invoices", { studentId });
  return response.data;
}

export async function createAdhocInvoice(
  data: CreateAdhocInvoicePayload
): Promise<Invoice> {
  const response = await apiClient.post<Invoice>("/invoices/adhoc", data);
  return response.data;
}

export async function reverseInvoice(
  id: number,
  reason: string
): Promise<Invoice> {
  const response = await apiClient.post<Invoice>(`/invoices/${id}/reverse`, {
    reason,
  });
  return response.data;
}

export async function getInvoicePreview(
  studentId: number
): Promise<InvoicePreview> {
  const response = await apiClient.get<InvoicePreview>(
    "/invoices/meta/preview",
    { params: { studentId } }
  );
  return response.data;
}

export async function getStudentStatement(
  studentId: number
): Promise<StudentStatement> {
  const response = await apiClient.get<StudentStatement>(
    `/invoices/statement/${studentId}`
  );
  return response.data;
}

// ---------------------------------------------------------------
// Payments
// ---------------------------------------------------------------

export interface PaymentFilters {
  page?: number;
  limit?: number;
  search?: string;
  studentId?: number;
  status?: string;
  method?: PaymentMethod;
  academicSessionId?: number;
}

export async function getPayments(
  filters: PaymentFilters = {}
): Promise<PaymentListResponse> {
  const { page = 1, limit = 25, ...rest } = filters;
  const response = await apiClient.get<PaymentListResponse>("/payments", {
    params: {
      page,
      limit,
      ...(rest.search ? { search: rest.search } : {}),
      ...(rest.studentId ? { studentId: rest.studentId } : {}),
      ...(rest.status ? { status: rest.status } : {}),
      ...(rest.method ? { method: rest.method } : {}),
      ...(rest.academicSessionId ? { academicSessionId: rest.academicSessionId } : {}),
    },
  });
  return response.data;
}

export async function getPayment(id: number): Promise<Payment> {
  const response = await apiClient.get<Payment>(`/payments/${id}`);
  return response.data;
}

export async function createPayment(
  data: CreatePaymentPayload
): Promise<Payment> {
  const response = await apiClient.post<Payment>("/payments", data);
  return response.data;
}

export async function reversePayment(
  id: number,
  reason: string
): Promise<Payment> {
  const response = await apiClient.post<Payment>(`/payments/${id}/reverse`, {
    reason,
  });
  return response.data;
}
