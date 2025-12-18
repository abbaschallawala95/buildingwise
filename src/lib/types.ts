export type Building = {
  id: string;
  name: string;
  address: string;
  memberCount: number;
};

export type Member = {
  id: string;
  buildingId: string;
  name: string;
  flatNumber: string;
  floor: number;
  contactNumber: string;
  monthlyMaintenance: number;
  previousDues: number;
};

export type Transaction = {
  id: string;
  buildingId: string;
  memberId: string;
  type: 'maintenance' | 'extra_collection' | 'expense';
  title: string;
  amount: number;
  month: string;
  paymentMode: 'Cash' | 'Online' | 'Cheque';
  receiptNumber: string;
  date: string; // ISO date string
};

export type Expense = {
  id:string;
  buildingId: string;
  type: 'light' | 'lift' | 'water' | 'repair' | 'other';
  description: string;
  amount: number;
  date: string; // ISO date string
}

export type ExtraCollection = {
    id: string;
    buildingId: string;
    title: string;
    totalAmount: number;
    date: string;
    paidMembers: string[]; // array of member IDs
}
