/**
 * Realistic ETA Calculation System
 * 
 * Accounts for:
 * - Weekly schedule adherence
 * - Progress patterns and habits
 * - Bulk upload bias correction
 * - Dormant periods
 * - Course starting date (Feb 23)
 * - Total syllabus vs actual progress
 * - Backlog accumulation patterns
 */

import type { WeekData } from "@/app/weekly/page";

export interface RealisticEtaConfig {
  // Time parameters (in hours)
  maxDailyStudyHours: number;
  minDailyStudyHours: number;
  realisticDailyHours: number;
  
  // Pattern parameters
  bulkUploadThreshold: number; // lectures per day
  dormantDayThreshold: number; // days without activity
  adherenceWeight: number; // how much to weight plan adherence
  
  // Calculation parameters
  lookbackDays: number;
  trendAnalysisDays: number;
  confidenceThreshold: number;
}

export interface StudyPatternAnalysis {
  // Weekly adherence
  planAdherenceRate: number; // 0-1, how well user follows weekly plan
  averageWeeklyCompletion: number; // actual hours completed per week vs planned
  
  // Activity patterns
  activeDaysPerWeek: number;
  studyDayFrequency: number; // days with activity / total days
  bulkUploadDays: number;
  dormantDays: number;
  
  // Progress patterns
  consistencyScore: number; // 0-1, how consistent study patterns are
  momentumScore: number; // 0-1, current study momentum
  burnoutRisk: number; // 0-1, risk of burnout based on patterns
  
  // Time distribution
  effectiveStudyHours: number; // hours after bulk upload correction
  realisticPace: number; // sustainable daily study hours
}

export interface RealisticEtaResult {
  // Core ETA
  estimatedCompletion: Date | null;
  daysToComplete: number | null;
  confidence: "very-high" | "high" | "medium" | "low" | "very-low";
  
  // Time-based metrics
  currentPace: number; // hours/day based on recent activity
  sustainablePace: number; // realistic sustainable pace
  planRequiredPace: number; // pace needed to follow weekly plan
  
  // Progress metrics
  totalProgress: number; // 0-1, overall course completion
  weeklyProgress: number; // 0-1, weekly plan completion
  backlogRate: number; // how fast backlog is accumulating
  
  // Pattern insights
  studyPattern: StudyPatternAnalysis;
  recommendations: string[];
  
  // Method metadata
  calculationMethod: string;
  factorsConsidered: string[];
  reliabilityScore: number; // 0-1
  lastUpdated: Date;
}

export class RealisticEtaCalculator {
  private static readonly COURSE_START_DATE = new Date("2026-02-23");
  private static readonly DEFAULT_CONFIG: RealisticEtaConfig = {
    maxDailyStudyHours: 8,
    minDailyStudyHours: 1,
    realisticDailyHours: 4,
    bulkUploadThreshold: 10,
    dormantDayThreshold: 3,
    adherenceWeight: 0.6,
    lookbackDays: 21,
    trendAnalysisDays: 7,
    confidenceThreshold: 0.7
  };

  /**
   * Calculate realistic ETA with comprehensive pattern analysis
   */
  static calculateRealisticEta(
    completedMap: Record<string, number | false>,
    durationMap: Record<string, number>,
    totalHours: number,
    weeks: WeekData[],
    config: Partial<RealisticEtaConfig> = {}
  ): RealisticEtaResult {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // Analyze study patterns
    const studyPattern = this.analyzeStudyPatterns(
      completedMap, 
      durationMap, 
      weeks, 
      finalConfig
    );
    
    // Calculate different pace scenarios
    const paces = this.calculatePaceScenarios(
      studyPattern, 
      totalHours, 
      weeks, 
      finalConfig
    );
    
    // Determine realistic completion time
    const completion = this.calculateRealisticCompletion(
      paces, 
      studyPattern, 
      totalHours, 
      finalConfig
    );
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      studyPattern, 
      paces, 
      completion
    );
    
    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(
      studyPattern, 
      paces, 
      completion
    );
    
    return {
      estimatedCompletion: completion.date,
      daysToComplete: completion.days,
      confidence,
      currentPace: paces.current,
      sustainablePace: paces.sustainable,
      planRequiredPace: paces.planRequired,
      totalProgress: completion.totalProgress,
      weeklyProgress: completion.weeklyProgress,
      backlogRate: completion.backlogRate,
      studyPattern,
      recommendations,
      calculationMethod: "realistic-pattern-v1",
      factorsConsidered: [
        "weekly-plan-adherence",
        "bulk-upload-correction", 
        "dormant-period-adjustment",
        "study-consistency",
        "momentum-analysis",
        "burnout-risk"
      ],
      reliabilityScore: studyPattern.consistencyScore * studyPattern.planAdherenceRate,
      lastUpdated: new Date()
    };
  }

  /**
   * Analyze comprehensive study patterns
   */
  private static analyzeStudyPatterns(
    completedMap: Record<string, number | false>,
    durationMap: Record<string, number>,
    weeks: WeekData[],
    config: RealisticEtaConfig
  ): StudyPatternAnalysis {
    const now = new Date();
    const lookbackStart = new Date(now);
    lookbackStart.setDate(lookbackStart.getDate() - config.lookbackDays);
    
    // Build daily study map
    const dailyMap = this.buildDailyStudyMap(completedMap, durationMap);
    
    // Analyze weekly plan adherence
    const weeklyAnalysis = this.analyzeWeeklyPlanAdherence(dailyMap, weeks, config);
    
    // Identify activity patterns
    const activityPatterns = this.analyzeActivityPatterns(dailyMap, lookbackStart, config);
    
    // Calculate consistency and momentum
    const consistencyScore = this.calculateStudyConsistency(dailyMap, config);
    const momentumScore = this.calculateStudyMomentum(dailyMap, config);
    const burnoutRisk = this.calculateBurnoutRisk(dailyMap, activityPatterns, config);
    
    // Apply bulk upload correction
    const correctedHours = this.applyBulkUploadCorrection(dailyMap, config);
    
    return {
      planAdherenceRate: weeklyAnalysis.adherenceRate,
      averageWeeklyCompletion: weeklyAnalysis.weeklyCompletionRate,
      activeDaysPerWeek: activityPatterns.activeDaysPerWeek,
      studyDayFrequency: activityPatterns.frequency,
      bulkUploadDays: activityPatterns.bulkUploadDays,
      dormantDays: activityPatterns.dormantDays,
      consistencyScore,
      momentumScore,
      burnoutRisk,
      effectiveStudyHours: correctedHours.effectiveDaily,
      realisticPace: correctedHours.realisticPace
    };
  }

  /**
   * Calculate different pace scenarios
   */
  private static calculatePaceScenarios(
    pattern: StudyPatternAnalysis,
    totalHours: number,
    weeks: WeekData[],
    config: RealisticEtaConfig
  ) {
    // Current pace (based on recent activity)
    const currentPace = pattern.effectiveStudyHours;
    
    // Sustainable pace (considering burnout risk and consistency)
    let sustainablePace = pattern.realisticPace;
    if (pattern.burnoutRisk > 0.7) {
      sustainablePace *= 0.7; // Reduce pace if high burnout risk
    } else if (pattern.momentumScore < 0.3) {
      sustainablePace *= 0.8; // Reduce pace if low momentum
    }
    
    // Plan required pace (what weekly plan demands)
    const totalPlannedHours = weeks.reduce((total, week) => 
      total + week.days.reduce((dayTotal, day) => 
        dayTotal + day.tasks.reduce((taskTotal, task) => taskTotal + task.hours, 0), 0), 0);
    const remainingWeeks = weeks.length;
    const planRequiredPace = remainingWeeks > 0 ? totalPlannedHours / (remainingWeeks * 7) : 0;
    
    return {
      current: currentPace,
      sustainable: sustainablePace,
      planRequired: planRequiredPace
    };
  }

  /**
   * Calculate realistic completion time
   */
  private static calculateRealisticCompletion(
    paces: { current: number; sustainable: number; planRequired: number },
    pattern: StudyPatternAnalysis,
    totalHours: number,
    config: RealisticEtaConfig
  ) {
    const now = new Date();
    const completedHours = this.getTotalCompletedHours(pattern.effectiveStudyHours, config.lookbackDays);
    const remainingHours = Math.max(0, totalHours - completedHours);
    
    // Choose the most appropriate pace
    let selectedPace = paces.sustainable;
    
    // If user is highly adherent to plan, use plan pace
    if (pattern.planAdherenceRate > 0.8) {
      selectedPace = paces.planRequired;
    }
    // If user has high momentum and consistency, use current pace
    else if (pattern.momentumScore > 0.7 && pattern.consistencyScore > 0.7) {
      selectedPace = paces.current;
    }
    
    // Apply realistic bounds
    selectedPace = Math.max(config.minDailyStudyHours, 
                   Math.min(config.maxDailyStudyHours, selectedPace));
    
    // Calculate completion
    const daysToComplete = selectedPace > 0 ? Math.ceil(remainingHours / selectedPace) : null;
    const estimatedDate = daysToComplete ? new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000) : null;
    
    // Calculate progress metrics
    const totalProgress = totalHours > 0 ? completedHours / totalHours : 0;
    const weeklyProgress = pattern.averageWeeklyCompletion;
    const backlogRate = this.calculateBacklogRate(pattern, paces);
    
    return {
      date: estimatedDate,
      days: daysToComplete,
      totalProgress,
      weeklyProgress,
      backlogRate
    };
  }

  /**
   * Build daily study map from completion data
   */
  private static buildDailyStudyMap(
    completedMap: Record<string, number | false>,
    durationMap: Record<string, number>
  ): Map<string, number> {
    const dailyMap = new Map<string, number>();
    
    Object.entries(completedMap).forEach(([lectureId, timestamp]) => {
      if (typeof timestamp === "number" && timestamp > 0) {
        const date = new Date(timestamp).toDateString();
        const duration = (durationMap[lectureId] || 1800) / 3600; // Convert to hours
        dailyMap.set(date, (dailyMap.get(date) || 0) + duration);
      }
    });
    
    return dailyMap;
  }

  /**
   * Analyze weekly plan adherence
   */
  private static analyzeWeeklyPlanAdherence(
    dailyMap: Map<string, number>,
    weeks: WeekData[],
    config: RealisticEtaConfig
  ) {
    let totalPlannedHours = 0;
    let totalActualHours = 0;
    let weeksWithActivity = 0;
    
    weeks.forEach(week => {
      const weekPlanned = week.days.reduce((total, day) => 
        total + day.tasks.reduce((dayTotal, task) => dayTotal + task.hours, 0), 0);
      
      // Find actual hours for this week's dates
      let weekActual = 0;
      week.days.forEach(day => {
        const dateStr = new Date(day.date).toDateString();
        weekActual += dailyMap.get(dateStr) || 0;
      });
      
      totalPlannedHours += weekPlanned;
      totalActualHours += weekActual;
      
      if (weekActual > 0) weeksWithActivity++;
    });
    
    const adherenceRate = totalPlannedHours > 0 ? totalActualHours / totalPlannedHours : 0;
    const weeklyCompletionRate = weeks.length > 0 ? weeksWithActivity / weeks.length : 0;
    
    return {
      adherenceRate,
      weeklyCompletionRate
    };
  }

  /**
   * Analyze activity patterns
   */
  private static analyzeActivityPatterns(
    dailyMap: Map<string, number>,
    lookbackStart: Date,
    config: RealisticEtaConfig
  ) {
    const entries = Array.from(dailyMap.entries())
      .filter(([dateStr]) => new Date(dateStr) >= lookbackStart);
    
    const totalDays = config.lookbackDays;
    const activeDays = entries.length;
    const frequency = totalDays > 0 ? activeDays / totalDays : 0;
    
    // Identify bulk upload days (> threshold lectures)
    const bulkUploadDays = entries.filter(([, hours]) => 
      hours > config.bulkUploadThreshold * 0.5 // Assuming 30min per lecture
    ).length;
    
    // Identify dormant periods
    const sortedDates = entries.map(([dateStr]) => new Date(dateStr)).sort();
    let maxGap = 0;
    let dormantDays = 0;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const gap = (sortedDates[i].getTime() - sortedDates[i-1].getTime()) / (24 * 60 * 60 * 1000);
      if (gap > config.dormantDayThreshold) {
        dormantDays += Math.floor(gap);
        maxGap = Math.max(maxGap, gap);
      }
    }
    
    const activeDaysPerWeek = (activeDays / totalDays) * 7;
    
    return {
      activeDaysPerWeek,
      frequency,
      bulkUploadDays,
      dormantDays
    };
  }

  /**
   * Calculate study consistency
   */
  private static calculateStudyConsistency(
    dailyMap: Map<string, number>,
    config: RealisticEtaConfig
  ): number {
    const hours = Array.from(dailyMap.values());
    if (hours.length < 3) return 0;
    
    const mean = hours.reduce((sum, h) => sum + h, 0) / hours.length;
    const variance = hours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / hours.length;
    const stdDev = Math.sqrt(variance);
    
    // Consistency score: lower variance = higher consistency
    const consistencyScore = Math.max(0, 1 - (stdDev / mean));
    return consistencyScore;
  }

  /**
   * Calculate study momentum
   */
  private static calculateStudyMomentum(
    dailyMap: Map<string, number>,
    config: RealisticEtaConfig
  ): number {
    const entries = Array.from(dailyMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-config.trendAnalysisDays);
    
    if (entries.length < 3) return 0.5; // Neutral momentum
    
    const recent = entries.slice(-Math.ceil(entries.length / 2));
    const older = entries.slice(0, Math.floor(entries.length / 2));
    
    const recentAvg = recent.reduce((sum, [, h]) => sum + h, 0) / recent.length;
    const olderAvg = older.reduce((sum, [, h]) => sum + h, 0) / older.length;
    
    // Momentum based on recent trend
    const change = (recentAvg - olderAvg) / olderAvg;
    return Math.max(0, Math.min(1, 0.5 + change));
  }

  /**
   * Calculate burnout risk
   */
  private static calculateBurnoutRisk(
    dailyMap: Map<string, number>,
    patterns: { bulkUploadDays: number; frequency: number },
    config: RealisticEtaConfig
  ): number {
    const hours = Array.from(dailyMap.values());
    if (hours.length === 0) return 0;
    
    let riskScore = 0;
    
    // High average hours increase risk
    const avgHours = hours.reduce((sum, h) => sum + h, 0) / hours.length;
    if (avgHours > config.realisticDailyHours * 1.5) riskScore += 0.3;
    if (avgHours > config.maxDailyStudyHours * 0.8) riskScore += 0.2;
    
    // Bulk uploads indicate cramming
    if (patterns.bulkUploadDays > 0) {
      riskScore += 0.2 * (patterns.bulkUploadDays / hours.length);
    }
    
    // Low frequency with high intensity (binge studying)
    if (patterns.frequency < 0.5 && avgHours > config.realisticDailyHours) {
      riskScore += 0.3;
    }
    
    return Math.min(1, riskScore);
  }

  /**
   * Apply bulk upload correction
   */
  private static applyBulkUploadCorrection(
    dailyMap: Map<string, number>,
    config: RealisticEtaConfig
  ) {
    const hours = Array.from(dailyMap.values());
    const maxDaily = config.realisticDailyHours;
    
    // Separate normal and excessive days
    const normalDays = hours.filter(h => h <= maxDaily);
    const excessiveDays = hours.filter(h => h > maxDaily);
    
    let effectiveDaily = 0;
    let realisticPace = 0;
    
    if (excessiveDays.length === 0) {
      // No bulk uploads, use simple average
      effectiveDaily = hours.reduce((sum, h) => sum + h, 0) / hours.length;
      realisticPace = effectiveDaily;
    } else {
      // Apply correction: cap excessive days and distribute
      const cappedExcessive = excessiveDays.map(h => maxDaily);
      const totalExcess = excessiveDays.reduce((sum, h) => sum + (h - maxDaily), 0);
      
      // Distribute excess over more days
      const allDays = [...normalDays, ...cappedExcessive];
      const distributedExcess = totalExcess / (allDays.length + Math.ceil(excessiveDays.length / 2));
      
      effectiveDaily = (allDays.reduce((sum, h) => sum + h, 0) + distributedExcess) / allDays.length;
      realisticPace = Math.min(effectiveDaily, maxDaily);
    }
    
    return {
      effectiveDaily,
      realisticPace
    };
  }

  /**
   * Calculate backlog rate
   */
  private static calculateBacklogRate(
    pattern: StudyPatternAnalysis,
    paces: { current: number; sustainable: number; planRequired: number }
  ): number {
    // Backlog accumulates when current pace < required pace
    if (paces.current < paces.planRequired) {
      return (paces.planRequired - paces.current) / paces.planRequired;
    }
    return 0;
  }

  /**
   * Generate personalized recommendations
   */
  private static generateRecommendations(
    pattern: StudyPatternAnalysis,
    paces: { current: number; sustainable: number; planRequired: number },
    completion: { backlogRate: number; weeklyProgress: number }
  ): string[] {
    const recommendations: string[] = [];
    
    // Plan adherence recommendations
    if (pattern.planAdherenceRate < 0.5) {
      recommendations.push("Consider adjusting your weekly schedule to match your actual study patterns");
    }
    
    // Consistency recommendations
    if (pattern.consistencyScore < 0.4) {
      recommendations.push("Try to maintain a more consistent daily study schedule");
    }
    
    // Burnout warnings
    if (pattern.burnoutRisk > 0.7) {
      recommendations.push("High burnout risk detected - consider reducing study intensity");
    }
    
    // Backlog warnings
    if (completion.backlogRate > 0.3) {
      recommendations.push("Backlog is accumulating - increase daily study hours or adjust schedule");
    }
    
    // Momentum recommendations
    if (pattern.momentumScore < 0.3) {
      recommendations.push("Study momentum is low - try to establish a regular routine");
    }
    
    return recommendations;
  }

  /**
   * Calculate overall confidence
   */
  private static calculateOverallConfidence(
    pattern: StudyPatternAnalysis,
    paces: { current: number; sustainable: number; planRequired: number },
    completion: { days: number | null }
  ): "very-high" | "high" | "medium" | "low" | "very-low" {
    let score = 0;
    
    // Data quality
    if (pattern.consistencyScore > 0.7) score += 2;
    if (pattern.planAdherenceRate > 0.6) score += 2;
    if (pattern.momentumScore > 0.5) score += 1;
    
    // Pattern reliability
    if (pattern.bulkUploadDays === 0) score += 1;
    if (pattern.dormantDays < 7) score += 1;
    
    // Reasonable timeframes
    if (completion.days && completion.days > 0 && completion.days < 365) score += 1;
    
    if (score >= 7) return "very-high";
    if (score >= 5) return "high";
    if (score >= 3) return "medium";
    if (score >= 1) return "low";
    return "very-low";
  }

  /**
   * Helper: Get total completed hours
   */
  private static getTotalCompletedHours(effectiveDaily: number, lookbackDays: number): number {
    return effectiveDaily * lookbackDays;
  }
}
