import { apiClient } from "./client";

export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "M_PESA"
  | "CHEQUE"
  | "CARD"
  | "OTHER";

export interface FinanceOverview {
  billed: number;
  collected: number;
  outstanding: number;
  credit: number;
  cashCollected: number;
  collectionRate: number;
  invoiceCounts: Record<string, number>;
  invoiceCount: number;
  paymentCount: number;
}

export interface AgingBucket {
  bucket: "current" | "1-30" | "31-60" | "61-90" | "90+";
  count: number;
  amount: number;
}

export interface CollectionRow {
  date: string;
  method: PaymentMethod;
  count: number;
  amount: number;
}

export interface Defaulter {
  id: number;
  admissionNumber: string | null;
  name: string;
  email: string;
  balance: number;
}

export interface DefaulterList {
  items: Defaulter[];
  total: number;
  page: number;
  limit: number;
}

export interface CourseSummaryRow {
  courseId: number | null;
  courseCode: string | null;
  courseName: string | null;
  students: number;
  billed: number;
  collected: number;
  outstanding: number;
  collectionRate: number;
}

export interface CreditBalance {
  id: number;
  admissionNumber: string | null;
  name: string;
  email: string;
  credit: number;
}

export interface ReversalRow {
  kind: "payment" | "invoice";
  id: number;
  reference: string;
  amount: number;
  reason: string | null;
  reversedAt: string;
  reversedByName: string | null;
}

export interface FinanceReports {
  overview: FinanceOverview;
  aging: AgingBucket[];
  courseSummary: CourseSummaryRow[];
  defaulters: Defaulter[];
  creditBalances: CreditBalance[];
  reversals: ReversalRow[];
  collections: CollectionRow[];
}

export async function getFinanceReports(): Promise<FinanceReports> {
  const [overview, aging, courseSummary, defaulters, creditBalances, reversals, collections] =
    await Promise.all([
      apiClient.get<FinanceOverview>("/reports/finance/overview"),
      apiClient.get<AgingBucket[]>("/reports/finance/aging"),
      apiClient.get<CourseSummaryRow[]>("/reports/finance/course-summary"),
      apiClient.get<DefaulterList>("/reports/finance/defaulters", {
        params: { page: 1, limit: 100 },
      }),
      apiClient.get<CreditBalance[]>("/reports/finance/credit-balances"),
      apiClient.get<ReversalRow[]>("/reports/finance/reversals"),
      apiClient.get<CollectionRow[]>("/reports/finance/collections"),
    ]);
  return {
    overview: overview.data,
    aging: aging.data,
    courseSummary: courseSummary.data,
    defaulters: defaulters.data.items,
    creditBalances: creditBalances.data,
    reversals: reversals.data,
    collections: collections.data,
  };
}
