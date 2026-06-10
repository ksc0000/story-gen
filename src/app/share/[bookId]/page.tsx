import { Metadata } from "next";
import { notFound } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BookDoc } from "@/lib/types";
import SharePageClient from "./share-page-client";

interface Props {
  params: Promise<{ bookId: string }>;
}

async function getBook(bookId: string) {
  const docRef = doc(db, "books", bookId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;

  const data = snap.data() as BookDoc;
  if (!data.public) return null;

  return { id: snap.id, ...data };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bookId } = await params;
  const book = await getBook(bookId);

  if (!book) {
    return {
      title: "Ehoria - 絵本が見つかりません",
    };
  }

  return {
    title: `${book.title} - Ehoriaで作成された絵本`,
    description: "AIで作成された、世界にひとつだけの絵本です。",
    openGraph: {
      title: book.title,
      description: "AIで作成された、世界にひとつだけの絵本です。",
      images: book.coverImageUrl ? [book.coverImageUrl] : [],
      type: "article",
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { bookId } = await params;
  const book = await getBook(bookId);

  if (!book) {
    notFound();
  }

  return <SharePageClient bookId={bookId} />;
}
