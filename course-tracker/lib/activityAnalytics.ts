"use client";
import { StudySession } from "@/lib/store";

export interface SubjectAnalytics {
  subjectName: string;
  totalSessions: number;
  totalMinutes: number;
  averageSessionLength: number;
  completionRate: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TimeAnalytics {
  bestHour: number;
  totalStudyDays: number;
  averageDailyMinutes: number;
  productivityScore: number;
  weeklyPattern: number[];
}

interface GoalProgress {
  type: 'daily' | 'weekly' | 'monthly';
  target: number;
  current: number;
  unit: 'minutes' | 'sessions' | 'lectures';
  percentage: number;
}

export function calculateSubjectAnalytics(
  sessions: StudySession[],
  completedLectures: Record<string, number | false>,
  subjects: Array<{ name: string; modules: Array<{ lectures: Array<{ id: string }> }> }>
): SubjectAnalytics[] {
  const subjectMap = new Map<string, StudySession[]>();
  
  // Group sessions by subject
  sessions.forEach(session => {
    if (!subjectMap.has(session.subjectName)) {
      subjectMap.set(session.subjectName, []);
    }
    subjectMap.get(session.subjectName)!.push(session);
  });

  const analytics: SubjectAnalytics[] = [];

  subjectMap.forEach((subjectSessions, subjectName) => {
    const totalMinutes = subjectSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalSessions = subjectSessions.length;
    const averageSessionLength = totalMinutes / totalSessions;

    // Calculate completion rate for this subject
    const subject = subjects.find(s => s.name === subjectName);
    let completionRate = 0;
    if (subject) {
      const totalLectures = subject.modules.reduce((sum, m) => sum + m.lectures.length, 0);
      const completedLecturesInSubject = Object.entries(completedLectures)
        .filter(([id, completed]) => {
          if (!completed) return false;
          // Check if this lecture belongs to this subject
          return subject.modules.some(m => m.lectures.some(l => l.id === id));
        }).length;
      completionRate = totalLectures > 0 ? (completedLecturesInSubject / totalLectures) * 100 : 0;
    }

    // Calculate trend (compare recent vs older sessions)
    const midpoint = Math.floor(subjectSessions.length / 2);
    const recentSessions = subjectSessions.slice(0, midpoint);
    const olderSessions = subjectSessions.slice(midpoint);
    
    const recentAvg = recentSessions.length > 0 
      ? recentSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / recentSessions.length 
      : 0;
    const olderAvg = olderSessions.length > 0 
      ? olderSessions.reduce((sum, s) => sum + s.durationMinutes, 0) / olderSessions.length 
      : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentAvg > olderAvg * 1.1) trend = 'up';
    else if (recentAvg < olderAvg * 0.9) trend = 'down';

    analytics.push({
      subjectName,
      totalSessions,
      totalMinutes,
      averageSessionLength,
      completionRate,
      trend
    });
  });

  return analytics.sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export function calculateTimeAnalytics(sessions: StudySession[]): TimeAnalytics {
  if (sessions.length === 0) {
    return {
      bestHour: 0,
      totalStudyDays: 0,
      averageDailyMinutes: 0,
      productivityScore: 0,
      weeklyPattern: new Array(7).fill(0)
    };
  }

  // Find best study hour
  const hourCounts = new Map<number, number>();
  sessions.forEach(session => {
    const hour = new Date(session.startedAt).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });
  
  const bestHour = Array.from(hourCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

  // Calculate study patterns
  const studyDays = new Set(sessions.map(s => 
    new Date(s.startedAt).toDateString()
  ));
  const totalStudyDays = studyDays.size;

  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const averageDailyMinutes = totalStudyDays > 0 ? totalMinutes / totalStudyDays : 0;

  // Calculate productivity score (0-100)
  const productivityScore = Math.min(100, 
    (averageDailyMinutes / 120) * 50 + // Daily goal contribution
    (totalStudyDays / 30) * 30 + // Consistency contribution  
    (sessions.length / 50) * 20 // Frequency contribution
  );

  // Weekly pattern (Sunday = 0)
  const weeklyPattern = new Array(7).fill(0);
  sessions.forEach(session => {
    const dayOfWeek = new Date(session.startedAt).getDay();
    weeklyPattern[dayOfWeek] += session.durationMinutes;
  });

  return {
    bestHour,
    totalStudyDays,
    averageDailyMinutes,
    productivityScore,
    weeklyPattern
  };
}

export function calculateGoalProgress(
  sessions: StudySession[],
  completedLectures: Record<string, number | false>
): GoalProgress[] {
  const now = new Date();
  const today = now.toDateString();
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Today's sessions
  const todaySessions = sessions.filter(s => 
    new Date(s.startedAt).toDateString() === today
  );
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  // This week's sessions
  const weekSessions = sessions.filter(s => 
    new Date(s.startedAt) >= thisWeek
  );
  const weekMinutes = weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  // This month's sessions
  const monthSessions = sessions.filter(s => 
    new Date(s.startedAt) >= thisMonth
  );
  const monthMinutes = monthSessions.reduce((sum, s) => sum + s.durationMinutes, 0);

  const completedToday = Object.values(completedLectures)
    .filter(val => val && new Date(val as number).toDateString() === today).length;

  return [
    {
      type: 'daily',
      target: 120, // 2 hours daily
      current: todayMinutes,
      unit: 'minutes',
      percentage: Math.min(100, (todayMinutes / 120) * 100)
    },
    {
      type: 'daily',
      target: 5, // 5 lectures daily
      current: completedToday,
      unit: 'lectures',
      percentage: Math.min(100, (completedToday / 5) * 100)
    },
    {
      type: 'weekly',
      target: 600, // 10 hours weekly
      current: weekMinutes,
      unit: 'minutes',
      percentage: Math.min(100, (weekMinutes / 600) * 100)
    },
    {
      type: 'monthly',
      target: 2400, // 40 hours monthly
      current: monthMinutes,
      unit: 'minutes',
      percentage: Math.min(100, (monthMinutes / 2400) * 100)
    }
  ];
}

export function generateInsights(
  subjectAnalytics: SubjectAnalytics[],
  timeAnalytics: TimeAnalytics,
  goalProgress: GoalProgress[]
): string[] {
  const insights: string[] = [];

  // Productivity insights
  if (timeAnalytics.productivityScore > 80) {
    insights.push("🔥 Excellent productivity! You're in the top 20% of study patterns.");
  } else if (timeAnalytics.productivityScore < 30) {
    insights.push("📈 Consider increasing daily study time for better consistency.");
  }

  // Time pattern insights
  const bestHourName = timeAnalytics.bestHour >= 12 ? 'afternoon' : 
                      timeAnalytics.bestHour >= 6 ? 'morning' : 'night';
  insights.push(`⏰ Your most productive time is in the ${bestHourName} (${timeAnalytics.bestHour}:00).`);

  // Subject insights
  if (subjectAnalytics.length > 0) {
    const topSubject = subjectAnalytics[0];
    insights.push(`🎯 You're most focused on ${topSubject.subjectName} (${Math.round(topSubject.totalMinutes/60)}h total).`);
    
    const strugglingSubject = subjectAnalytics.find(s => s.completionRate < 50);
    if (strugglingSubject) {
      insights.push(`💡 Consider spending more time on ${strugglingSubject.subjectName} (${Math.round(strugglingSubject.completionRate)}% completion).`);
    }
  }

  // Goal-based insights
  const dailyGoal = goalProgress.find(g => g.type === 'daily' && g.unit === 'minutes');
  if (dailyGoal && dailyGoal.percentage < 50) {
    insights.push("⚡ You're behind today's study goal. Consider a focused session!");
  }

  // Consistency insights
  if (timeAnalytics.totalStudyDays >= 7) {
    insights.push(`📅 Great consistency! You've studied for ${timeAnalytics.totalStudyDays} days.`);
  }

  return insights;
}
