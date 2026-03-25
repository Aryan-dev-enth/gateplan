export interface WeekData {
  weekId: string;
  label: string;
  days: DayData[];
}

export interface DayData {
  date: string;
  label: string;
  tasks: TaskData[];
}

export interface TaskData {
  subject: string;
  module: string;
  lectureRefs: string[];
  hours: number;
  lectureIds: string[];
}
