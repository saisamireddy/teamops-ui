export interface Task {
    id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigned_to: number | null;
  assigned_username: string | null;
  is_deleted: boolean;
  updated_at: string;
}
