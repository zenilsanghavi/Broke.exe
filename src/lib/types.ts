export type Bucket = {
  id: string;
  name: string;
  pct: number;
  color: number;
  is_off: boolean;
  is_archived: boolean;
  sort: number;
};

export type Entry = {
  id: string;
  type: 'in' | 'out';
  entry_date: string; // YYYY-MM-DD
  amount: number;
  source: string | null;
  note: string;
  bucket_id: string | null;
  pay: string | null;
  alloc: Record<string, number>;
  recurring_id: string | null;
};

export type Rec = {
  id: string;
  name: string;
  amount: number;
  bucket_id: string | null;
  due_day: number;
  months: number | null;
  start_month: string; // YYYY-MM
};

export type Settings = {
  reserve: number;
  last_bucket: string | null;
  last_pay: string;
};

export const SOURCES = ['Salary', 'Freelance', 'Gift', 'Pocket money', 'Other'];
export const PAY = ['UPI', 'Cash', 'Card', 'Bank'];
