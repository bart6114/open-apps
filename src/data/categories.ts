export type Category = {
  slug: string;
  name: string;
  blurb: string;
  count?: number;
};

export const categories: Category[] = [
  {
    slug: "productivity",
    name: "Productivity",
    blurb: "Tasks, notes, calendars, personal knowledge bases.",
    count: 42,
  },
  {
    slug: "finance",
    name: "Finance",
    blurb: "Budgeting, invoicing, wallets, expense tracking.",
    count: 24,
  },
  {
    slug: "education",
    name: "Education",
    blurb: "Flashcards, language learning, classroom tools.",
    count: 18,
  },
  {
    slug: "developer-tools",
    name: "Developer Tools",
    blurb: "Code viewers, debugging utilities, CLI companions.",
    count: 15,
  },
  {
    slug: "communication",
    name: "Communication",
    blurb: "Chat, email, conferencing, messaging protocols.",
    count: 21,
  },
  {
    slug: "health",
    name: "Health",
    blurb: "Fitness, meditation, symptom tracking, sleep.",
    count: 12,
  },
  {
    slug: "business",
    name: "Business",
    blurb: "Invoicing, CRM, project management, accounting.",
    count: 17,
  },
  {
    slug: "games",
    name: "Games",
    blurb: "Open-source games, engines, and learning projects.",
    count: 9,
  },
  {
    slug: "utilities",
    name: "Utilities",
    blurb: "File tools, networking, system helpers, automation.",
    count: 23,
  },
];
