export class NotificationDto {
  id: string;
  title: string;
  body: string;
  type: string;
  resourceType?: string;
  resourceId?: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export class UnreadCountDto {
  count: number;
}

export class MarkReadDto {
  ids?: string[];
}
