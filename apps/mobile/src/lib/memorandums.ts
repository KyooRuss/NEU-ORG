import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// Memorandums are files (PDFs, documents, images) that admins upload on the
// web dashboard. Every logged-in user can read them.

export type Memorandum = {
  id: string;
  title: string;
  // The original name of the uploaded file.
  fileName: string;
  // Path inside the private "memorandums" storage bucket.
  filePath: string;
  createdAt: Date;
};

const MEMO_BUCKET = 'memorandums';
// How long the link to a memorandum's file works, in seconds.
const LINK_SECONDS = 600;

// Newest first. Pass a limit for a preview, like the two on Home.
export async function fetchMemorandums(limit?: number): Promise<Memorandum[]> {
  let query = supabase
    .from('memorandums')
    .select('id, title, file_name, file_path, created_at')
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    fileName: row.file_name as string,
    filePath: row.file_path as string,
    createdAt: new Date(row.created_at as string),
  }));
}

// Opens the file in the in-app browser through a short-lived link, since the
// bucket is private.
export async function openMemorandum(memo: Memorandum) {
  const { data, error } = await supabase.storage.from(MEMO_BUCKET).createSignedUrl(memo.filePath, LINK_SECONDS);
  if (error) throw error;
  await WebBrowser.openBrowserAsync(data.signedUrl);
}

// "Oct 26, 2026"
export function formatMemoDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
