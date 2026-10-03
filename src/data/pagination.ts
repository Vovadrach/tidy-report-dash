export const fetchAllPages = async <T>(readPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>, signal?: AbortSignal): Promise<T[]> => {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Запит скасовано', 'AbortError');
    const { data, error } = await readPage(from, from + size - 1);
    if (signal?.aborted) throw signal.reason ?? new DOMException('Запит скасовано', 'AbortError');
    if (error) throw error;
    rows.push(...data ?? []);
    if (!data || data.length < size) return rows;
  }
};

/** Cursor reads avoid duplicate/skipped rows when another device inserts at the top. */
export const fetchCursorPages = async <T extends { id: string }>(
  readPage: (after: T | null, size: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  signal?: AbortSignal,
): Promise<T[]> => {
  const rows = new Map<string,T>();
  const size = 500;
  let after: T | null = null;
  for (;;) {
    if (signal?.aborted) throw signal.reason ?? new DOMException('Запит скасовано', 'AbortError');
    const { data, error } = await readPage(after,size);
    if (signal?.aborted) throw signal.reason ?? new DOMException('Запит скасовано', 'AbortError');
    if (error) throw error;
    for (const row of data ?? []) rows.set(row.id,row);
    if (!data || data.length < size) return [...rows.values()];
    const next = data[data.length - 1];
    if (next.id === after?.id) throw new Error('Не вдалося продовжити завантаження історії');
    after = next;
  }
};
