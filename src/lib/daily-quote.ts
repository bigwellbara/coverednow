import { harareDay } from "../modules/billing/domain/public-bill";

export type Quote = { text: string; by: string; note?: string };

/** Well-sourced lines on education and giving together. One is shown each day. */
export const QUOTES: readonly Quote[] = [
  {
    text: "Education is the most powerful weapon which you can use to change the world.",
    by: "Nelson Mandela",
  },
  {
    text: "One child, one teacher, one book, one pen can change the world.",
    by: "Malala Yousafzai",
  },
  {
    text: "Chara chimwe hachitswanyi inda.",
    by: "Shona proverb",
    note: "One thumb alone cannot crush a louse: we achieve more together.",
  },
  {
    text: "The beautiful thing about learning is nobody can take it away from you.",
    by: "B.B. King",
  },
  {
    text: "Umuntu ngumuntu ngabantu.",
    by: "Ndebele proverb",
    note: "A person is a person through other people.",
  },
  {
    text: "If you educate a man you educate an individual, but if you educate a woman you educate a family.",
    by: "James Emman Kwegyir Aggrey",
  },
];

/** The quote for today in Harare, the same for every visitor. */
export function quoteOfTheDay(now: Date): Quote {
  const dayNumber = Math.floor(Date.parse(harareDay(now)) / 86_400_000);
  return QUOTES[dayNumber % QUOTES.length]!;
}
