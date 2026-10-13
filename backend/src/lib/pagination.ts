import { z } from 'zod';

const schema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function parsePage(query: unknown): {
  page: number;
  pageSize: number;
  from: number;
  to: number;
  skip: number;
  take: number;
} {
  const { page, pageSize } = schema.parse(query);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, from: skip, to: skip + pageSize - 1, skip, take: pageSize };
}

