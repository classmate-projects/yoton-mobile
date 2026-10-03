import { API_BASE_URL } from "@/config/env";

// Same endpoint catalogue as the MAUI app's BaseLibrary/APILibrary.cs - and the same Yoton
// ASP.NET Core Web API behind it. Every patient route is scoped server-side to the JWT's own
// identity: the client never passes a patientId.
export const Endpoints = {
  auth: {
    login: "/api/auth/login",
    refreshToken: "/api/auth/refresh-token",
    revokeToken: "/api/auth/revoke-token",
  },
  patient: {
    me: "/api/patient/me",
    appointments: "/api/patient/appointments",
    testResults: "/api/patient/test-results",
    prescriptions: "/api/patient/prescriptions",
    consultations: "/api/patient/consultations",
    /** Date-filtered consultation list for the EMR view. */
    emrConsultations: (from: string, to: string) =>
      `/api/patient/consultations?from=${from}&to=${to}`,
    /** Full encounter detail for one visit (doctor entries, nurse notes, triage, test results). */
    encounterDetail: (encounterId: string) => `/api/patient/consultations/${encounterId}`,
    bills: "/api/patient/bills",
    specializationsDoctors: "/api/patient/specializations-doctors",
    doctorSlots: (doctorId: string, date: string) =>
      `/api/patient/doctor-slots/${doctorId}?date=${date}`,
  },
  // Shared with the web app's staff chat UI (same /api/chat/* controller).
  chat: {
    contacts: "/api/chat/contacts",
    conversations: "/api/chat/conversations",
    messages: (conversationId: string) => `/api/chat/conversations/${conversationId}/messages`,
    sendMessage: "/api/chat/messages",
    markRead: (conversationId: string) => `/api/chat/conversations/${conversationId}/read`,
    reactions: (messageId: string) => `/api/chat/messages/${messageId}/reactions`,
    presence: (ids: string) => `/api/chat/presence?ids=${encodeURIComponent(ids)}`,
    hub: `${API_BASE_URL}/chat-hub`,
  },
} as const;

// The API returns backend-relative upload paths (e.g. "/Uploads/LabResults/x.pdf"); the app and
// the API don't share an origin, so they need the API's origin prefixed before they're a
// fetchable URL. Mirrors the web app's lib/backendAsset.ts.
export function backendAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path}`;
}
