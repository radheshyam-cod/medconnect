export class SearchQueryDto {
  q: string;
}

export class SearchResultDto {
  id: string;
  type: 'TIMELINE' | 'MEDICATION' | 'LAB_RESULT' | 'DOCUMENT';
  title: string;
  description?: string;
  date: Date;
  metadata?: Record<string, unknown>;
}
