// UrbanVista — TypeScript interfaces (data is now fetched from backend API)

export interface House {
  id: string;
  houseNumber: string;
  block: string;
  floor: number;
  status: "occupied" | "vacant" | "maintenance";
  membersCount: number;
  vehiclesCount: number;
  notes?: string;
}

export interface Member {
  id: string;
  name: string;
  houseId: string;
  houseNumber: string;
  role: "Owner" | "Tenant" | "Family";
  phone: string;
  email: string;
  isActive: boolean;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  type: "Two Wheeler" | "Four Wheeler";
  color: string;
  ownerId: string;
  ownerName: string;
  houseId: string;
  houseNumber: string;
}

export interface MaintenanceRecord {
  id: string;
  houseId: string;
  houseNumber: string;
  ownerName: string;
  fromMonth: string;
  toMonth: string;
  baseAmount: number;
  lateFee: number;
  extraCharges: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethod: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
  paymentDate: string | null;
  status: "Paid" | "Pending" | "Overdue";
}

export interface Expenditure {
  id: string;
  title: string;
  category: "Utilities" | "Maintenance" | "Security" | "Cleaning" | "Admin" | "Other";
  amount: number;
  paymentMode: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
  date: string;
  description: string;
}

