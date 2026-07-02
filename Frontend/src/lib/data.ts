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
  userId?: string | null;
  propertyId?: string | null;
  houseNumber: string;
  ownerName: string;
  fromMonth: string;
  toMonth: string;
  dueDate?: string | null;
  baseAmount: number;
  lateFee: number;
  lateFeePerDay?: number;
  lateFeeAmount?: number;
  overdueDays?: number;
  extraCharges: number;
  totalAmount: number;
  dueAmount?: number;
  totalPayable?: number;
  displayStatus?: string;
  amountPaid: number;
  paidAmount?: number;
  paymentMethod: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
  paymentDate: string | null;
  status: "Paid" | "Pending" | "Overdue" | "Partial" | "paid" | "pending" | "overdue" | "partial";
}

export interface ReceiptRecord {
  id: string;
  paymentId: string;
  residentId?: string | null;
  maintenanceId: string;
  amount: number;
  receiptNumber: string;
  createdAt: string;
  generatedAt?: string | null;
  paidAt?: string | null;
  paymentStatus?: string | null;
  pdfReference?: string | null;
  razorpayTransactionId?: string | null;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  paymentMethod?: string | null;
  houseId?: string | null;
  houseNumber?: string | null;
  blockName?: string | null;
  residentName?: string | null;
  fromMonth?: string | null;
  toMonth?: string | null;
  dueDate?: string | null;
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

export interface SecretaryAssignment {
  id: string;
  assignmentType: "block";
  block: string;
  houseId?: string;
  isActive: boolean;
  assignedAt: string;
}

export interface Secretary {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "secretary";
  status: "active" | "disabled";
  mustResetPassword: boolean;
  createdAt: string;
  assignedBlocks?: string[];
  assignments?: SecretaryAssignment[];
}

