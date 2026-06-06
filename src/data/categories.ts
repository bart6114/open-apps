export type Category = {
  slug: string;
  name: string;
  blurb: string;
  count?: number;
};

export const categories: Category[] = [
  { slug: "productivity", name: "Productivity", blurb: "Tasks, notes, calendars, knowledge bases.", count: 24 },
  { slug: "finance", name: "Finance", blurb: "Budgeting, wallets, expense tracking.", count: 18 },
  { slug: "education", name: "Education", blurb: "Flashcards, learning, reference apps.", count: 9 },
  { slug: "tools", name: "Tools", blurb: "Browsers, utilities, dev helpers, file tools.", count: 23 },
  { slug: "communication", name: "Communication", blurb: "Chat, messaging, social, team tools.", count: 16 },
  { slug: "health-and-fitness", name: "Health and Fitness", blurb: "Workouts, nutrition, wellness tracking.", count: 11 },
  { slug: "business", name: "Business", blurb: "Invoicing, jobs, marketplace, ops tools.", count: 8 },
  { slug: "games", name: "Games", blurb: "Open-source games and engines.", count: 14 },
  { slug: "media", name: "Media", blurb: "Music, movies, photos, audio and video.", count: 12 },
  { slug: "entertainment", name: "Entertainment", blurb: "TV, movies, books, anime, ebooks.", count: 9 },
  { slug: "social-network", name: "Social Network", blurb: "Decentralized social clients and readers.", count: 13 },
  { slug: "shopping", name: "Shopping", blurb: "E-commerce, delivery, food, retail.", count: 6 },
  { slug: "news", name: "News and Magazine", blurb: "Hacker News clients, RSS, magazines.", count: 5 },
  { slug: "travel", name: "Travel", blurb: "Flights, tourism, cab sharing, guides.", count: 4 },
];
