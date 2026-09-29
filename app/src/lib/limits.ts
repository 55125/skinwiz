// Shared by the API routes (enforced) and the client forms (maxLength).
export const LIMITS = {
  title: 120,
  authorName: 60,
  notes: 2000,
  stepDescription: 500,
  maxSteps: 20,
  name: 120,
  email: 254,
  credential: 200,
  message: 2000,
  reason: 500,
} as const;
