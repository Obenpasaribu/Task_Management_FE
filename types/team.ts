export interface Team {
  id: number;
  name: string;
  description: string;
  leadId: number;
  memberIds: number[];
}
