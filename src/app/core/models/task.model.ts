export interface Task {
    id: number;
  title: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  is_deleted: boolean;
  updated_at: string;
}
