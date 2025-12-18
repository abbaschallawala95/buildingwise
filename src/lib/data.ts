import type { Building, Member, Transaction, Expense, ExtraCollection } from './types';

export const buildings: Building[] = [
  { id: 'b1', name: 'Sunrise Apartments', address: '123 Sunshine Ave, Cityville', memberCount: 50 },
  { id: 'b2', name: 'Ocean View Towers', address: '456 Ocean Blvd, Beachtown', memberCount: 120 },
  { id: 'b3', name: 'Greenwood Estates', address: '789 Forest Rd, Mapleton', memberCount: 75 },
];

export const members: Member[] = [
  { id: 'm1', buildingId: 'b1', name: 'John Doe', flatNumber: 'A-101', floor: 1, contactNumber: '123-456-7890', monthlyMaintenance: 2000, previousDues: 500 },
  { id: 'm2', buildingId: 'b1', name: 'Jane Smith', flatNumber: 'B-204', floor: 2, contactNumber: '234-567-8901', monthlyMaintenance: 2500, previousDues: 0 },
  { id: 'm3', buildingId: 'b2', name: 'Peter Jones', flatNumber: 'C-301', floor: 3, contactNumber: '345-678-9012', monthlyMaintenance: 3000, previousDues: 3000 },
  { id: 'm4', buildingId: 'b2', name: 'Mary Johnson', flatNumber: 'D-1201', floor: 12, contactNumber: '456-789-0123', monthlyMaintenance: 3500, previousDues: 0 },
  { id: 'm5', buildingId: 'b3', name: 'David Williams', flatNumber: '10A', floor: 10, contactNumber: '567-890-1234', monthlyMaintenance: 2200, previousDues: 2200 },
];

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentYear = new Date().getFullYear();

export const transactions: Transaction[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `t-inc-${i + 1}`,
    buildingId: 'b1',
    memberId: `m${(i % 2) + 1}`,
    type: 'maintenance' as const,
    title: 'Monthly Maintenance',
    amount: 2000 + Math.random() * 500,
    month: `${months[i]} ${currentYear}`,
    paymentMode: (i % 3 === 0 ? 'Cash' : i % 3 === 1 ? 'Online' : 'Cheque') as 'Cash' | 'Online' | 'Cheque',
    receiptNumber: `R-${currentYear}00${i + 1}`,
    date: new Date(currentYear, i, 15).toISOString(),
  })),
  {
    id: 't-extra-1',
    buildingId: 'b1',
    memberId: 'm1',
    type: 'extra_collection',
    title: 'Diwali Celebration Fund',
    amount: 500,
    month: `October ${currentYear}`,
    paymentMode: 'Online',
    receiptNumber: `EC-2024001`,
    date: new Date(currentYear, 9, 5).toISOString(),
  }
];

export const expenses: Expense[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `e-exp-${i + 1}`,
    buildingId: 'b1',
    type: (i % 5 === 0 ? 'light' : i % 5 === 1 ? 'lift' : i % 5 === 2 ? 'water' : i % 5 === 3 ? 'repair' : 'other') as 'light' | 'lift' | 'water' | 'repair' | 'other',
    description: `Expense for ${months[i]}`,
    amount: 1000 + Math.random() * 1500,
    date: new Date(currentYear, i, 20).toISOString(),
  })),
];


export const extraCollections: ExtraCollection[] = [
  {
    id: 'ec1',
    buildingId: 'b1',
    title: 'Elevator Repair Fund',
    totalAmount: 50000,
    date: new Date(currentYear, 4, 10).toISOString(),
    paidMembers: ['m1'],
  },
  {
    id: 'ec2',
    buildingId: 'b1',
    title: 'Annual Painting',
    totalAmount: 200000,
    date: new Date(currentYear, 6, 15).toISOString(),
    paidMembers: ['m1', 'm2'],
  },
  {
    id: 'ec3',
    buildingId: 'b2',
    title: 'Swimming Pool Maintenance',
    totalAmount: 75000,
    date: new Date(currentYear, 7, 1).toISOString(),
    paidMembers: ['m4'],
  },
];
