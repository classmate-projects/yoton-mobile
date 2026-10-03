// Client-side mirrors of Yoton_API.DTOs (PatientDTO, ChatDTO, AuthDTO). Field names are the
// camelCase the API actually serializes - checked against live responses, not assumed.

// Every controller wraps its payload as { message, data }.
export interface ApiEnvelope<T> {
  message?: string;
  data?: T;
}

// ---------------- auth ----------------

export interface LoginResponse {
  userId: string;
  name: string;
  role: string;
  token: string;
  refreshToken?: string | null;
  isDefaultPassword: boolean;
  currencyCode?: string | null;
  currencySymbol?: string | null;
  idleTimeoutMinutes?: number | null;
}

// ---------------- patient self-service ----------------

export interface MyProfile {
  opId?: string | null;
  opNumber?: string | null;
  name: string;
  sex?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  profileImagePath?: string | null;
}

export interface MyAppointment {
  appointmentId?: string | null;
  doctorId?: string | null;
  doctorName: string;
  specializationName?: string | null;
  appointmentDate: string;
  status: string;
  notes?: string | null;
}

export interface MyTestResult {
  testResultId?: string | null;
  category: string; // "Lab" | "Radiology"
  testName: string;
  priority?: string | null;
  status: string;
  doctorName?: string | null;
  requestedDate: string;
  completedDate?: string | null;
  hasResultFile: boolean;
  resultFilePath?: string | null;
}

export interface MyMedication {
  medicationId?: string | null;
  drugName: string;
  dosage?: string | null;
  frequency?: string | null;
  route?: string | null;
  instructions?: string | null;
  durationDays?: number | null;
  status: string; // Active | Discontinued
  doctorName?: string | null;
  startedAt: string;
  endedAt?: string | null;
}

// View-only - there is no payment gateway anywhere in this app.
export interface MyBillItem {
  description?: string | null;
  amount: number;
}

export interface MyBill {
  billId?: string | null;
  totalAmount: number;
  discount: number;
  tax: number;
  netAmount: number;
  status: string; // Pending | Paid | Cancelled
  paymentMethod?: string | null;
  paymentDate?: string | null;
  createdAt: string;
  items: MyBillItem[];
}

export interface MyConsultation {
  encounterId?: string | null;
  appointmentId?: string | null;
  doctorName?: string | null;
  specializationName?: string | null;
  chiefComplaint?: string | null;
  diagnosisDescription?: string | null;
  plannedProcedures?: string | null;
  status: string;
  createdAt: string;
}

// ---------------- self-service booking ----------------

export interface DoctorCard {
  doctorId?: string | null;
  name: string;
  specializationId?: string | null;
  specializationName?: string | null;
  experienceYears: number;
  consultationFee: number;
}

export interface SpecializationDoctors {
  specializationId?: string | null;
  specializationName: string;
  doctors: DoctorCard[];
}

// PII-free by design: a patient may see THAT a slot is shared (bookedCount/maxCapacity) but
// never WHO else is booked into it.
export interface PatientSlot {
  start: string;
  end: string;
  isAvailable: boolean;
  isPast: boolean;
  bookedCount: number;
  maxCapacity: number;
}

export interface BookingResult {
  status: boolean;
  message?: string | null;
  data?: MyAppointment | null;
}

// ---------------- chat ----------------

export interface ChatContact {
  id: string;
  type: string; // "User" | "Reception" | "Patient"
  name: string;
  role?: string | null;
  avatarUrl?: string | null;
}

export interface ChatConversationItem {
  chatConversationId: string;
  otherId: string;
  otherType: string;
  otherName: string;
  otherAvatarUrl?: string | null;
  lastMessage?: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface ChatAttachment {
  chatMessageAttachmentId: string;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  contentType?: string | null;
}

export interface ChatReactionSummary {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface ChatMessageItem {
  chatMessageId: string;
  chatConversationId: string;
  senderId: string;
  senderType: string; // "Patient" | "User"
  content: string;
  createdAt: string;
  readAt?: string | null;
  replyToMessageId?: string | null;
  replyToPreview?: string | null;
  attachments: ChatAttachment[];
  reactions: ChatReactionSummary[];
}

export interface ChatPresence {
  userId: string;
  isOnline: boolean;
}

// Fixed, small reaction set - matches the web app's CHAT_REACTION_EMOJIS. Deliberately not a
// full emoji keyboard (keeps chat professional).
export const CHAT_REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

// ---------------- EMR (electronic medical record) ----------------

// The tile shown in the date-filtered EMR grid.
export interface EmrConsultationListItem {
  encounterId?: string | null;
  doctorName?: string | null;
  specializationName?: string | null;
  chiefComplaint?: string | null;
  createdAt: string;
}

export interface EmrRos {
  constitutional?: string | null;
  eyeEarNoseMouthThroat?: string | null;
  cardiovascular?: string | null;
  respiratory?: string | null;
  gastroenterology?: string | null;
  genitourinary?: string | null;
  musculoskeletal?: string | null;
  neurological?: string | null;
  psychiatric?: string | null;
  endocrine?: string | null;
  hematologic?: string | null;
  allergicImmunologic?: string | null;
  integumentary?: string | null;
}

export interface EmrNurseNote {
  nurseNoteId?: string | null;
  nurseName?: string | null;
  contentHtml: string;
  createdAt: string;
}

export interface EmrTriage {
  triageId?: string | null;
  nurseName?: string | null;
  chiefComplaint?: string | null;
  priorityLevel?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  bmi?: number | null;
  temperature?: number | null;
  tempSite?: string | null;
  heartRate?: number | null;
  bPSystolic?: number | null;
  bPDiastolic?: number | null;
  respiratory?: number | null;
  oxygenSaturation?: number | null;
  bloodSugar?: number | null;
  actionDateTime: string;
}

export interface EmrEncounterDetail {
  encounterId?: string | null;
  doctorName?: string | null;
  specializationName?: string | null;
  createdAt: string;
  // Doctor entries
  chiefComplaint?: string | null;
  diagnosisCode?: string | null;
  diagnosisDescription?: string | null;
  examinationNotes?: string | null;
  clinicalExamination?: string | null;
  plannedProcedures?: string | null;
  reviewOfSystems?: EmrRos | null;
  medications: MyMedication[];
  // Nurse entries
  nurseNotes: EmrNurseNote[];
  triage?: EmrTriage | null;
  // Lab / radiology results ordered during this visit
  testResults: MyTestResult[];
}
