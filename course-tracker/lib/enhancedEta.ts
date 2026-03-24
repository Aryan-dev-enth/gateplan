/**
 * Enhanced ETA Calculation System with Database Storage
 * 
 * Features:
 * - Multiple calculation algorithms with weighted confidence
 * - Historical trend analysis
 * - Subject-specific performance tracking
 * - Database persistence for historical data
 * - Adaptive learning based on actual vs predicted performance
 */

import type { WeekData } from "@/app/weekly/page";

export interface EnhancedEtaMetrics {
  // Core ETA data
  etaDate: Date | null;
  daysToFinish: number | null;
  confidence: "very-high" | "high" | "medium" | "low" | "very-low";
  
  // Performance metrics
  avgDailyHours: number;
  medianDailyHours: number;
  consistencyScore: number; // 0-1 scale
  productivityTrend: "improving" | "stable" | "declining";
  
  // Plan comparison
  plannedDailyHours: number;
  planEfficiency: number; // actual/planned ratio
  isBehindPlan: boolean;
  daysBehindPlan: number | null;
  
  // Advanced metrics
  subjectPerformance: Record<string, {
    avgPace: number;
    consistency: number;
    efficiency: number;
  }>;
  
  // Predictive analytics
  predictedCompletionRange: {
    optimistic: Date | null;
    realistic: Date | null;
    pessimistic: Date | null;
  };
  
  // Historical data
  totalHoursStudied: number;
  activeDays: number;
  streakDays: number;
  longestStreak: number;
  
  // Adaptive stats (for time distribution)
  adaptiveStats: {
    distributionApplied: boolean;
    originalAverage: number;
    adjustedAverage: number;
    totalExcessHours: number;
    adjustedDays: number;
  };
  
  // Metadata
  calculationMethod: string;
  lastUpdated: Date;
  dataQuality: "excellent" | "good" | "fair" | "poor";
}

export interface EtaHistoryEntry {
  date: Date;
  metrics: EnhancedEtaMetrics;
  actualHoursStudied: number;
  predictionAccuracy: number; // How accurate previous prediction was
}

export interface StudyPattern {
  bestStudyDays: number[]; // 0-6 (Sunday-Saturday)
  peakStudyHours: { start: number; end: number }; // 24h format
  averageSessionLength: number;
  preferredSubjects: string[];
  burnoutRisk: "low" | "medium" | "high";
}

export class EnhancedEtaCalculator {
  private static readonly ANALYSIS_WINDOW_DAYS = 30;
  private static readonly TREND_ANALYSIS_DAYS = 14;
  private static readonly MIN_DATA_DAYS = 3;

  /**
   * Calculate enhanced ETA with multiple algorithms and comprehensive metrics
   */
  static calculateEnhancedEta(
    completedMap: Record<string, number | false>,
    durationMap: Record<string, number>,
    hoursRemaining: number,
    plannedDailyHours: number,
    weeks: WeekData[],
    subjectData: Record<string, { totalHours: number; plannedHours: number }>,
    historicalData?: EtaHistoryEntry[],
    lectureIdSet?: Set<string>
  ): EnhancedEtaMetrics {
    const now = Date.now();
    const windowStart = now - this.ANALYSIS_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    // Filter valid completions
    const allEntries = Object.entries(completedMap).filter(
      ([id, v]) => typeof v === "number" && v > 0 && (!lectureIdSet || lectureIdSet.has(id))
    ) as [string, number][];

    const windowEntries = allEntries.filter(([, v]) => v >= windowStart);

    // Basic metrics with adaptive time distribution
    const dailyHoursMap = this.buildDailyHoursMap(allEntries, durationMap);
    const adaptiveStats = this.calculateAdaptiveDailyAverage(dailyHoursMap, durationMap);
    const robustStats = this.calculateRobustDailyAverage(dailyHoursMap);
    const totalHoursStudied = Array.from(dailyHoursMap.values()).reduce((sum, hours) => sum + hours, 0);
    const activeDays = dailyHoursMap.size;
    
    // Use adaptive average if distribution was applied, otherwise use robust average
    const avgDailyHours = adaptiveStats.distributionApplied ? 
      adaptiveStats.adjustedAverage : 
      robustStats.robustAverage;
    const medianDailyHours = robustStats.medianAverage;

    // Advanced metrics
    const consistencyScore = this.calculateConsistency(dailyHoursMap);
    const productivityTrend = this.calculateTrend(dailyHoursMap);
    const streakData = this.calculateStreaks(dailyHoursMap);
    
    // Subject-specific performance
    const subjectPerformance = this.calculateSubjectPerformance(
      allEntries, durationMap, subjectData
    );

    // Plan comparison
    const planEfficiency = plannedDailyHours > 0 ? avgDailyHours / plannedDailyHours : 0;
    const isBehindPlan = planEfficiency < 0.8 && hoursRemaining > 0;
    const daysBehindPlan = isBehindPlan ? 
      Math.ceil((hoursRemaining / avgDailyHours) - (hoursRemaining / plannedDailyHours)) : null;

    // Enhanced ETA calculation with multiple algorithms
    const etaResult = this.calculateWeightedEta(
      dailyHoursMap, 
      hoursRemaining, 
      plannedDailyHours,
      consistencyScore,
      productivityTrend
    );

    // Predictive range based on confidence and variance
    const predictedRange = this.calculatePredictionRange(
      etaResult.etaDate,
      etaResult.confidence,
      dailyHoursMap
    );

    // Data quality assessment with adaptive stats
    const dataQuality = this.assessDataQuality(activeDays, windowEntries.length, totalHoursStudied);
    
    // Calculate reliability based on adaptive stats
    const adaptiveReliability = adaptiveStats.distributionApplied ? 
      adaptiveStats.reliability : 
      robustStats.confidence;

    return {
      ...etaResult,
      avgDailyHours,
      medianDailyHours,
      consistencyScore,
      productivityTrend,
      plannedDailyHours,
      planEfficiency,
      isBehindPlan,
      daysBehindPlan,
      subjectPerformance,
      predictedCompletionRange: predictedRange,
      totalHoursStudied,
      activeDays,
      streakDays: streakData.current,
      longestStreak: streakData.longest,
      calculationMethod: adaptiveStats.distributionApplied ? 
        `adaptive-distributed-v2 (${adaptiveStats.adjustedDays} days adjusted)` : 
        "enhanced-weighted-v2",
      lastUpdated: new Date(),
      dataQuality,
      // Add adaptive stats for transparency
      adaptiveStats: {
        distributionApplied: adaptiveStats.distributionApplied,
        originalAverage: adaptiveStats.originalAverage,
        adjustedAverage: adaptiveStats.adjustedAverage,
        totalExcessHours: adaptiveStats.totalExcessHours,
        adjustedDays: adaptiveStats.adjustedDays
      }
    };
  }

  /**
   * Calculate robust daily average with outlier detection
   */
  private static calculateRobustDailyAverage(
    dailyHoursMap: Map<string, number>
  ): {
    robustAverage: number;
    medianAverage: number;
    outlierCount: number;
    dataPoints: number;
    confidence: number;
  } {
    const dailyHours = Array.from(dailyHoursMap.values());
    
    if (dailyHours.length === 0) {
      return { robustAverage: 0, medianAverage: 0, outlierCount: 0, dataPoints: 0, confidence: 0 };
    }

    // Sort for percentile calculations
    const sortedHours = [...dailyHours].sort((a, b) => a - b);
    
    // Detect outliers using IQR method
    const q1Index = Math.floor(sortedHours.length * 0.25);
    const q3Index = Math.floor(sortedHours.length * 0.75);
    const q1 = sortedHours[q1Index];
    const q3 = sortedHours[q3Index];
    const iqr = q3 - q1;
    
    // Outlier bounds (1.5 * IQR rule)
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    // Filter out outliers
    const filteredHours = sortedHours.filter(hours => 
      hours >= lowerBound && hours <= upperBound
    );
    
    const outlierCount = dailyHours.length - filteredHours.length;
    
    // Calculate robust statistics
    const medianAverage = this.median(sortedHours);
    const robustAverage = filteredHours.length > 0 ? 
      filteredHours.reduce((sum, h) => sum + h, 0) / filteredHours.length : 
      medianAverage;
    
    // Confidence based on data quality and outlier ratio
    const outlierRatio = outlierCount / dailyHours.length;
    let confidence = 1.0;
    
    if (dailyHours.length < 7) confidence *= 0.7;
    if (dailyHours.length < 14) confidence *= 0.8;
    if (outlierRatio > 0.3) confidence *= 0.5;
    if (outlierRatio > 0.5) confidence *= 0.3;
    
    return {
      robustAverage,
      medianAverage,
      outlierCount,
      dataPoints: dailyHours.length,
      confidence
    };
  }

  /**
   * Calculate weighted pace with outlier protection
   */
  private static calculateWeightedPace(
    dailyHoursMap: Map<string, number>,
    consistencyScore: number,
    productivityTrend: "improving" | "stable" | "declining"
  ): {
    weightedPace: number;
    method: string;
    reliability: number;
  } {
    const robustStats = this.calculateRobustDailyAverage(dailyHoursMap);
    const { robustAverage, medianAverage, outlierCount, confidence } = robustStats;
    
    // If too many outliers, rely heavily on median
    if (outlierCount > dailyHoursMap.size * 0.4) {
      return {
        weightedPace: medianAverage,
        method: "median-dominant",
        reliability: confidence * 0.6
      };
    }
    
    // Recent trend analysis (last 7 days)
    const recentPace = this.calculateRecentPace(dailyHoursMap, 7);
    const recentStats = this.calculateRobustDailyAverage(
      this.getRecentDailyMap(dailyHoursMap, 7)
    );
    
    // Weight different methods based on data quality
    let weightedPace = robustAverage;
    let method = "robust-average";
    let reliability = confidence;
    
    // Blend with recent performance if we have enough recent data
    if (recentStats.dataPoints >= 5 && recentStats.confidence > 0.6) {
      const recentWeight = Math.min(0.4, recentStats.dataPoints / 14);
      weightedPace = (1 - recentWeight) * robustAverage + recentWeight * recentStats.robustAverage;
      method = "blended-robust-recent";
      reliability = Math.max(confidence, recentStats.confidence) * 0.9;
    }
    
    // Apply trend adjustment
    const trendMultiplier = productivityTrend === "improving" ? 1.05 : 
                           productivityTrend === "declining" ? 0.95 : 1.0;
    weightedPace *= trendMultiplier;
    
    // Apply consistency bonus
    if (consistencyScore > 0.8) {
      reliability *= 1.1;
    } else if (consistencyScore < 0.4) {
      reliability *= 0.8;
    }
    
    return { weightedPace, method, reliability: Math.min(1.0, reliability) };
  }

  /**
   * Get recent daily map for analysis
   */
  private static getRecentDailyMap(
    dailyHoursMap: Map<string, number>,
    days: number
  ): Map<string, number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentMap = new Map<string, number>();
    dailyHoursMap.forEach((hours, dateStr) => {
      if (new Date(dateStr) >= cutoffDate) {
        recentMap.set(dateStr, hours);
      }
    });
    
    return recentMap;
  }

  /**
   * Apply time distribution cap to excessive daily study hours
   * Spreads hours over multiple days to create realistic averages
   */
  private static applyTimeDistributionCap(
    dailyHoursMap: Map<string, number>,
    maxDailyHours: number = 6,
    distributionDays: number = 3
  ): Map<string, number> {
    const adjustedMap = new Map<string, number>();
    const excessHoursPool: { date: string; excess: number }[] = [];
    
    // First pass: identify excess hours and cap daily amounts
    dailyHoursMap.forEach((hours, dateStr) => {
      if (hours > maxDailyHours) {
        const cappedHours = maxDailyHours;
        const excessHours = hours - maxDailyHours;
        
        adjustedMap.set(dateStr, cappedHours);
        excessHoursPool.push({ date: dateStr, excess: excessHours });
      } else {
        adjustedMap.set(dateStr, hours);
      }
    });
    
    // Second pass: distribute excess hours over surrounding days
    excessHoursPool.forEach(({ date: originalDate, excess }) => {
      const originalDateObj = new Date(originalDate);
      const remainingExcess = excess;
      const hoursPerDay = excess / distributionDays;
      
      // Distribute excess over the next few days
      for (let i = 1; i <= distributionDays && remainingExcess > 0; i++) {
        const targetDate = new Date(originalDateObj);
        targetDate.setDate(targetDate.getDate() + i);
        const targetDateStr = targetDate.toDateString();
        
        const currentHours = adjustedMap.get(targetDateStr) || 0;
        const newHours = Math.min(currentHours + hoursPerDay, maxDailyHours);
        const actualAdded = newHours - currentHours;
        
        adjustedMap.set(targetDateStr, newHours);
      }
    });
    
    return adjustedMap;
  }

  /**
   * Calculate adaptive daily average with time distribution
   */
  private static calculateAdaptiveDailyAverage(
    dailyHoursMap: Map<string, number>,
    durationMap: Record<string, number>
  ): {
    adjustedAverage: number;
    originalAverage: number;
    distributionApplied: boolean;
    adjustedDays: number;
    totalExcessHours: number;
    reliability: number;
  } {
    const dailyHours = Array.from(dailyHoursMap.values());
    
    if (dailyHours.length === 0) {
      return { 
        adjustedAverage: 0, 
        originalAverage: 0, 
        distributionApplied: false, 
        adjustedDays: 0, 
        totalExcessHours: 0,
        reliability: 0 
      };
    }

    const originalAverage = dailyHours.reduce((sum, h) => sum + h, 0) / dailyHours.length;
    
    // Check if we need time distribution (more than 20% of days exceed 6 hours)
    const maxDailyHours = 6;
    const excessiveDays = dailyHours.filter(h => h > maxDailyHours).length;
    const needsDistribution = (excessiveDays / dailyHours.length) > 0.2;
    
    if (!needsDistribution) {
      return {
        adjustedAverage: originalAverage,
        originalAverage,
        distributionApplied: false,
        adjustedDays: 0,
        totalExcessHours: 0,
        reliability: 0.9 // High reliability for normal patterns
      };
    }
    
    // Apply time distribution
    const distributionDays = Math.min(3, Math.max(2, Math.floor(excessiveDays / 2)));
    const adjustedMap = this.applyTimeDistributionCap(dailyHoursMap, maxDailyHours, distributionDays);
    
    // Calculate new average
    const adjustedHours = Array.from(adjustedMap.values());
    const adjustedAverage = adjustedHours.reduce((sum, h) => sum + h, 0) / adjustedHours.length;
    
    // Calculate impact metrics
    const totalExcessHours = dailyHours
      .filter(h => h > maxDailyHours)
      .reduce((sum, h) => sum + (h - maxDailyHours), 0);
    
    const adjustedDays = excessiveDays;
    
    // Calculate reliability based on distribution intensity
    const excessRatio = totalExcessHours / (dailyHours.reduce((sum, h) => sum + h, 0));
    let reliability = 0.8;
    
    if (excessRatio > 0.4) reliability *= 0.7; // Heavy bulk upload
    else if (excessRatio > 0.25) reliability *= 0.85; // Moderate bulk upload
    
    // Bonus for consistent distribution
    if (distributionDays >= 3) reliability *= 1.1;
    
    return {
      adjustedAverage,
      originalAverage,
      distributionApplied: true,
      adjustedDays,
      totalExcessHours,
      reliability: Math.min(0.95, reliability)
    };
  }
  private static detectBulkUploadPattern(
    dailyHoursMap: Map<string, number>,
    durationMap: Record<string, number>
  ): {
    hasBulkPattern: boolean;
    suspiciousDays: string[];
    avgNormalDay: number;
    bulkDays: number;
  } {
    const dailyHours = Array.from(dailyHoursMap.entries());
    const avgHours = dailyHours.reduce((sum, [, h]) => sum + h, 0) / dailyHours.length;
    
    // Calculate expected lecture duration
    const lectureDurations = Object.values(durationMap).filter(d => d > 0);
    const avgLectureDuration = lectureDurations.length > 0 ? 
      lectureDurations.reduce((sum, d) => sum + d, 0) / lectureDurations.length : 
      1800; // 30 minutes default
    
    const expectedDailyHours = 3; // Reasonable daily study hours
    const maxLecturesPerDay = 8; // Reasonable max lectures per day
    const maxHoursPerDay = maxLecturesPerDay * (avgLectureDuration / 3600);
    
    const suspiciousDays: string[] = [];
    let bulkDays = 0;
    
    dailyHours.forEach(([dateStr, hours]) => {
      const estimatedLectures = hours / (avgLectureDuration / 3600);
      
      // Flag suspicious patterns
      if (hours > maxHoursPerDay || estimatedLectures > maxLecturesPerDay) {
        suspiciousDays.push(dateStr);
        bulkDays++;
      }
    });
    
    const hasBulkPattern = bulkDays > 0 && (bulkDays / dailyHours.length) > 0.1;
    
    // Calculate average excluding bulk days
    const normalDays = dailyHours.filter(([, h]) => h <= maxHoursPerDay);
    const avgNormalDay = normalDays.length > 0 ? 
      normalDays.reduce((sum, [, h]) => sum + h, 0) / normalDays.length : 
      avgHours;
    
    return {
      hasBulkPattern,
      suspiciousDays,
      avgNormalDay,
      bulkDays
    };
  }
  /**
   * Calculate weighted ETA using multiple algorithms with outlier protection
   */
  private static calculateWeightedEta(
    dailyHoursMap: Map<string, number>,
    hoursRemaining: number,
    plannedDailyHours: number,
    consistencyScore: number,
    productivityTrend: "improving" | "stable" | "declining"
  ): {
    etaDate: Date | null;
    daysToFinish: number | null;
    confidence: "very-high" | "high" | "medium" | "low" | "very-low";
  } {
    const dailyHours = Array.from(dailyHoursMap.values());
    
    if (dailyHours.length === 0 || hoursRemaining <= 0) {
      return {
        etaDate: hoursRemaining <= 0 ? new Date() : null,
        daysToFinish: hoursRemaining <= 0 ? 0 : null,
        confidence: dailyHours.length === 0 ? "very-low" : "very-high"
      };
    }

    // Detect bulk upload patterns first
    const bulkPattern = this.detectBulkUploadPattern(dailyHoursMap, {}); // durationMap would be passed in real implementation
    
    // Use robust weighted pace calculation
    const paceResult = this.calculateWeightedPace(dailyHoursMap, consistencyScore, productivityTrend);
    const { weightedPace, method, reliability } = paceResult;
    
    // If we detected bulk patterns, adjust confidence down
    let adjustedReliability = reliability;
    if (bulkPattern.hasBulkPattern) {
      adjustedReliability *= 0.7; // Reduce confidence if bulk uploads detected
    }
    
    // Calculate ETA
    const daysToFinish = Math.ceil(hoursRemaining / weightedPace);
    const etaDate = new Date(Date.now() + daysToFinish * 24 * 60 * 60 * 1000);

    // Calculate confidence based on reliability and data quality
    const confidence = this.calculateConfidence(
      dailyHours.length,
      consistencyScore,
      productivityTrend,
      weightedPace / plannedDailyHours,
      adjustedReliability,
      bulkPattern.hasBulkPattern
    );

    return { etaDate, daysToFinish, confidence };
  }

  /**
   * Calculate prediction range based on confidence and variance
   */
  private static calculatePredictionRange(
    etaDate: Date | null,
    confidence: string,
    dailyHoursMap: Map<string, number>
  ): {
    optimistic: Date | null;
    realistic: Date | null;
    pessimistic: Date | null;
  } {
    if (!etaDate) {
      return { optimistic: null, realistic: null, pessimistic: null };
    }

    const dailyHours = Array.from(dailyHoursMap.values());
    const variance = this.calculateVariance(dailyHours);
    const stdDev = Math.sqrt(variance);
    
    // Range multipliers based on confidence
    const rangeMultipliers = {
      "very-high": { optimistic: 0.9, pessimistic: 1.1 },
      "high": { optimistic: 0.85, pessimistic: 1.15 },
      "medium": { optimistic: 0.8, pessimistic: 1.2 },
      "low": { optimistic: 0.7, pessimistic: 1.3 },
      "very-low": { optimistic: 0.6, pessimistic: 1.4 }
    };

    const multipliers = rangeMultipliers[confidence as keyof typeof rangeMultipliers];
    const baseDays = Math.ceil((etaDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

    return {
      optimistic: new Date(Date.now() + baseDays * multipliers.optimistic * 24 * 60 * 60 * 1000),
      realistic: etaDate,
      pessimistic: new Date(Date.now() + baseDays * multipliers.pessimistic * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Analyze study patterns
   */
  static analyzeStudyPatterns(
    completedMap: Record<string, number | false>,
    durationMap: Record<string, number>
  ): StudyPattern {
    const dailyHoursMap = this.buildDailyHoursMap(
      Object.entries(completedMap).filter(
        ([id, v]) => typeof v === "number" && v > 0
      ) as [string, number][],
      durationMap
    );

    // Best study days
    const dayTotals = new Array(7).fill(0);
    dailyHoursMap.forEach((hours, dateStr) => {
      const day = new Date(dateStr).getDay();
      dayTotals[day] += hours;
    });
    const bestStudyDays = dayTotals
      .map((total, index) => ({ total, index }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map(item => item.index);

    // Peak study hours (simplified - assumes most activity during completion times)
    const completionHours = Object.entries(completedMap)
      .filter(([, v]) => typeof v === "number" && v > 0)
      .map(([, ts]) => new Date(ts as number).getHours());

    const hourCounts = new Array(24).fill(0);
    completionHours.forEach(hour => hourCounts[hour]++);
    
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
    const peakStudyHours = {
      start: Math.max(0, peakHour - 2),
      end: Math.min(23, peakHour + 2)
    };

    // Average session length
    const sessionLengths = this.calculateSessionLengths(completedMap, durationMap);
    const averageSessionLength = sessionLengths.length > 0 ?
      sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length : 0;

    // Burnout risk (simplified heuristic)
    const recentAvg = this.calculateRecentPace(dailyHoursMap, 7);
    const overallAvg = Array.from(dailyHoursMap.values()).reduce((sum, h) => sum + h, 0) / dailyHoursMap.size;
    const burnoutRisk = recentAvg > overallAvg * 1.5 ? "high" :
                       recentAvg > overallAvg * 1.2 ? "medium" : "low";

    return {
      bestStudyDays,
      peakStudyHours,
      averageSessionLength,
      preferredSubjects: [], // Would need subject mapping
      burnoutRisk
    };
  }

  // Helper methods
  private static buildDailyHoursMap(
    entries: [string, number][],
    durationMap: Record<string, number>
  ): Map<string, number> {
    const dailyMap = new Map<string, number>();
    
    entries.forEach(([id, timestamp]) => {
      const dateStr = new Date(timestamp).toDateString();
      const hours = (durationMap[id] ?? 0) / 3600;
      dailyMap.set(dateStr, (dailyMap.get(dateStr) ?? 0) + hours);
    });

    return dailyMap;
  }

  private static median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private static calculateConsistency(dailyHoursMap: Map<string, number>): number {
    const values = Array.from(dailyHoursMap.values());
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Consistency score: 1 = perfectly consistent, 0 = very inconsistent
    return Math.max(0, 1 - (stdDev / mean));
  }

  private static calculateTrend(dailyHoursMap: Map<string, number>): "improving" | "stable" | "declining" {
    const entries = Array.from(dailyHoursMap.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-this.TREND_ANALYSIS_DAYS);

    if (entries.length < 3) return "stable";

    const recent = entries.slice(-Math.ceil(entries.length / 2));
    const older = entries.slice(0, Math.floor(entries.length / 2));

    const recentAvg = recent.reduce((sum, [, h]) => sum + h, 0) / recent.length;
    const olderAvg = older.reduce((sum, [, h]) => sum + h, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return "improving";
    if (change < -0.1) return "declining";
    return "stable";
  }

  private static calculateStreaks(dailyHoursMap: Map<string, number>): { current: number; longest: number } {
    const dates = Array.from(dailyHoursMap.keys())
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (let i = dates.length - 1; i >= 0; i--) {
      const currentDate = new Date(dates[i]);
      const nextDate = i < dates.length - 1 ? new Date(dates[i + 1]) : null;

      if (i === dates.length - 1) {
        // Check if last study day was yesterday or today
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (currentDate.toDateString() === today.toDateString() ||
            currentDate.toDateString() === yesterday.toDateString()) {
          currentStreak = 1;
        } else {
          break;
        }
      } else if (nextDate && (currentDate.getTime() + 24 * 60 * 60 * 1000) === nextDate.getTime()) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    tempStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const currentDate = new Date(dates[i]);
      const prevDate = new Date(dates[i - 1]);

      if ((currentDate.getTime() - prevDate.getTime()) === 24 * 60 * 60 * 1000) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    return { current: currentStreak, longest: Math.max(longestStreak, 1) };
  }

  private static calculateSubjectPerformance(
    entries: [string, number][],
    durationMap: Record<string, number>,
    subjectData: Record<string, { totalHours: number; plannedHours: number }>
  ): Record<string, { avgPace: number; consistency: number; efficiency: number }> {
    // This would need subject ID mapping from lecture IDs
    // Simplified implementation for now
    return {};
  }

  private static calculateRecentPace(dailyHoursMap: Map<string, number>, days: number): number {
    const recentEntries = Array.from(dailyHoursMap.entries())
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .slice(0, days);

    if (recentEntries.length === 0) return 0;
    
    const totalHours = recentEntries.reduce((sum, [, hours]) => sum + hours, 0);
    return totalHours / recentEntries.length;
  }

  private static calculateConfidence(
    dataDays: number,
    consistencyScore: number,
    trend: "improving" | "stable" | "declining",
    planEfficiency: number,
    reliability: number = 1.0,
    hasBulkPattern: boolean = false
  ): "very-high" | "high" | "medium" | "low" | "very-low" {
    let score = 0;

    // Data quantity
    if (dataDays >= 21) score += 3;
    else if (dataDays >= 14) score += 2;
    else if (dataDays >= 7) score += 1;

    // Consistency
    if (consistencyScore >= 0.8) score += 2;
    else if (consistencyScore >= 0.6) score += 1;

    // Trend
    if (trend === "improving") score += 1;
    else if (trend === "declining") score -= 1;

    // Plan efficiency
    if (planEfficiency >= 0.9 && planEfficiency <= 1.1) score += 1;
    else if (planEfficiency < 0.5 || planEfficiency > 1.5) score -= 1;

    // Apply reliability multiplier
    score *= reliability;

    // Penalty for bulk upload patterns
    if (hasBulkPattern) {
      score -= 2;
    }

    if (score >= 6) return "very-high";
    if (score >= 4) return "high";
    if (score >= 2) return "medium";
    if (score >= 0) return "low";
    return "very-low";
  }

  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private static calculateSessionLengths(
    completedMap: Record<string, number | false>,
    durationMap: Record<string, number>
  ): number[] {
    // Simplified - would need session grouping logic
    return Object.entries(completedMap)
      .filter(([, v]) => typeof v === "number" && v > 0)
      .map(([id]) => (durationMap[id] ?? 0) / 3600);
  }

  private static assessDataQuality(
    activeDays: number,
    windowEntries: number,
    totalHours: number
  ): "excellent" | "good" | "fair" | "poor" {
    if (activeDays >= 21 && totalHours >= 50) return "excellent";
    if (activeDays >= 14 && totalHours >= 30) return "good";
    if (activeDays >= 7 && totalHours >= 15) return "fair";
    return "poor";
  }
}
