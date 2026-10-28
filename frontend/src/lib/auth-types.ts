export type UserRole = "CLIENT" | "FREELANCER";

export interface DemoUser {
  id: string;
  role: UserRole;
  email: string;
  name: string;
  title: string;
  companyOrHandle: string;
  location: string;
  timezone: string;
  avatar: string;
  statusBadge: string;
  summary: string;
  hourlyRateCents?: number;
  budgetCeilingCents?: number;
  canLogin: boolean;
  isDemoData: boolean;
}

export const DEMO_USERS: Record<string, DemoUser> = {
  CLIENT: {
    id: "usr_client_alex",
    role: "CLIENT",
    email: "alex.rivera@proofloop.demo",
    name: "Alex Rivera",
    title: "Founder & Lead Merchant",
    companyOrHandle: "Horizon Commerce LLC",
    location: "San Francisco, USA",
    timezone: "America/Los_Angeles (UTC-7)",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
    statusBadge: "Verified US Buyer",
    summary: "Managing a cross-border e-commerce web platform requiring milestone-governed payments.",
    budgetCeilingCents: 450000, // $4,500.00 USD
    canLogin: true,
    isDemoData: true,
  },
  FREELANCER_A: {
    id: "usr_freelancer_rohan",
    role: "FREELANCER",
    email: "rohan.verma@proofloop.demo",
    name: "Rohan Verma",
    title: "Senior Full-Stack & Payment Rails Engineer",
    companyOrHandle: "@rohan_v",
    location: "Bengaluru, India",
    timezone: "Asia/Kolkata (UTC+5:30)",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
    statusBadge: "PayPal Sandbox Verified · Level 3",
    summary: "Full-stack engineer specializing in Next.js, state machines, API idempotency, and PayPal Orders v2.",
    hourlyRateCents: 6500, // $65.00/hr
    canLogin: true,
    isDemoData: true,
  },
  FREELANCER_B: {
    id: "usr_freelancer_priya",
    role: "FREELANCER",
    email: "priya.sharma@proofloop.demo",
    name: "Priya Sharma",
    title: "UI/UX & Design Systems Architect",
    companyOrHandle: "@priya_design",
    location: "Mumbai, India",
    timezone: "Asia/Kolkata (UTC+5:30)",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
    statusBadge: "Figma Master · Seeded Profile",
    summary: "Design systems expert crafting high-conversion e-commerce experiences.",
    hourlyRateCents: 5500,
    canLogin: false,
    isDemoData: true,
  },
  FREELANCER_C: {
    id: "usr_freelancer_marcus",
    role: "FREELANCER",
    email: "marcus.chen@proofloop.demo",
    name: "Marcus Chen",
    title: "Cloud Infrastructure & Reliability Engineer",
    companyOrHandle: "@marcus_ops",
    location: "Singapore",
    timezone: "Asia/Singapore (UTC+8)",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
    statusBadge: "AWS Certified · Seeded Profile",
    summary: "Kubernetes, CI/CD, and high-availability database cluster specialist.",
    hourlyRateCents: 7500,
    canLogin: false,
    isDemoData: true,
  },
};
