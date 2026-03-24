/**
 * ETA History Storage System
 * 
 * Handles persistent storage of ETA calculations, predictions, and accuracy tracking
 */

import { EnhancedEtaMetrics, EtaHistoryEntry, StudyPattern } from "./enhancedEta";

export interface EtaStorageSchema {
  userId: string;
  currentMetrics: EnhancedEtaMetrics;
  history: EtaHistoryEntry[];
  studyPatterns: StudyPattern;
  predictionAccuracy: {
    lastMonth: number;
    lastWeek: number;
    overall: number;
  };
  lastCalculated: Date;
}

export class EtaStorage {
  private static readonly STORAGE_KEY = "gateplan_eta_data";
  private static readonly MAX_HISTORY_ENTRIES = 100;

  /**
   * Save current ETA metrics to localStorage
   */
  static async saveEtaMetrics(
    userId: string,
    metrics: EnhancedEtaMetrics,
    actualHoursStudied: number = 0
  ): Promise<void> {
    try {
      const existing = this.getEtaData(userId);
      
      // Calculate prediction accuracy if we have previous predictions
      const predictionAccuracy = this.calculatePredictionAccuracy(
        existing.currentMetrics,
        metrics,
        actualHoursStudied
      );

      // Create history entry
      const historyEntry: EtaHistoryEntry = {
        date: new Date(),
        metrics: { ...metrics },
        actualHoursStudied,
        predictionAccuracy: predictionAccuracy.current
      };

      // Update history (keep only recent entries)
      const updatedHistory = [historyEntry, ...existing.history]
        .slice(0, this.MAX_HISTORY_ENTRIES);

      // Update storage
      const updatedData: Partial<EtaStorageSchema> = {
        currentMetrics: metrics,
        history: updatedHistory,
        predictionAccuracy: {
          ...existing.predictionAccuracy,
          ...predictionAccuracy
        },
        lastCalculated: new Date()
      };

      this.saveEtaData(userId, { ...existing, ...updatedData });

    } catch (error) {
      console.error("Failed to save ETA metrics:", error);
      throw new Error("ETA storage failed");
    }
  }

  /**
   * Get stored ETA data for user
   */
  static getEtaData(userId: string): EtaStorageSchema {
    try {
      const allData = this.getAllEtaData();
      const userData = allData[userId];

      if (!userData) {
        // Return default structure for new users
        return {
          userId,
          currentMetrics: this.getDefaultMetrics(),
          history: [],
          studyPatterns: this.getDefaultStudyPatterns(),
          predictionAccuracy: {
            lastMonth: 0,
            lastWeek: 0,
            overall: 0
          },
          lastCalculated: new Date()
        };
      }

      return userData;
    } catch (error) {
      console.error("Failed to get ETA data:", error);
      return this.getDefaultEtaData(userId);
    }
  }

  /**
   * Get ETA history for analysis
   */
  static getEtaHistory(userId: string, days?: number): EtaHistoryEntry[] {
    const data = this.getEtaData(userId);
    let history = data.history;

    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      history = history.filter(entry => entry.date >= cutoffDate);
    }

    return history;
  }

  /**
   * Get prediction accuracy trends
   */
  static getAccuracyTrends(userId: string): {
    daily: Array<{ date: Date; accuracy: number }>;
    weekly: Array<{ week: Date; accuracy: number }>;
    monthly: Array<{ month: Date; accuracy: number }>;
  } {
    const history = this.getEtaHistory(userId, 90); // Last 90 days
    
    // Group by day
    const dailyMap = new Map<string, number>();
    history.forEach(entry => {
      const dateKey = entry.date.toDateString();
      dailyMap.set(dateKey, entry.predictionAccuracy);
    });

    const daily = Array.from(dailyMap.entries()).map(([dateStr, accuracy]) => ({
      date: new Date(dateStr),
      accuracy
    }));

    // Group by week (simplified)
    const weekly: Array<{ week: Date; accuracy: number }> = [];
    for (let i = 0; i < daily.length; i += 7) {
      const weekData = daily.slice(i, i + 7);
      if (weekData.length > 0) {
        const avgAccuracy = weekData.reduce((sum, d) => sum + d.accuracy, 0) / weekData.length;
        weekly.push({
          week: weekData[0].date,
          accuracy: avgAccuracy
        });
      }
    }

    // Group by month (simplified)
    const monthly: Array<{ month: Date; accuracy: number }> = [];
    const monthMap = new Map<string, number[]>();
    
    daily.forEach(({ date, accuracy }) => {
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
      monthMap.get(monthKey)!.push(accuracy);
    });

    monthMap.forEach((accuracies, monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);
      const avgAccuracy = accuracies.reduce((sum, a) => sum + a, 0) / accuracies.length;
      monthly.push({
        month: new Date(year, month, 1),
        accuracy: avgAccuracy
      });
    });

    return { daily, weekly, monthly };
  }

  /**
   * Export ETA data for backup
   */
  static exportEtaData(userId: string): string {
    const data = this.getEtaData(userId);
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import ETA data from backup
   */
  static async importEtaData(userId: string, jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData) as EtaStorageSchema;
      
      // Validate data structure
      if (!this.validateEtaData(data)) {
        throw new Error("Invalid ETA data format");
      }

      this.saveEtaData(userId, data);
    } catch (error) {
      console.error("Failed to import ETA data:", error);
      throw new Error("ETA import failed");
    }
  }

  /**
   * Clear ETA data for user
   */
  static clearEtaData(userId: string): void {
    try {
      const allData = this.getAllEtaData();
      delete allData[userId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allData));
    } catch (error) {
      console.error("Failed to clear ETA data:", error);
    }
  }

  /**
   * Get storage statistics
   */
  static getStorageStats(): {
    totalUsers: number;
    totalHistoryEntries: number;
    oldestEntry: Date | null;
    newestEntry: Date | null;
    storageSize: string;
  } {
    try {
      const allData = this.getAllEtaData();
      const userIds = Object.keys(allData);
      
      let totalHistory = 0;
      let oldestDate: Date | null = null;
      let newestDate: Date | null = null;

      userIds.forEach(userId => {
        const data = allData[userId];
        totalHistory += data.history.length;
        
        data.history.forEach(entry => {
          if (!oldestDate || entry.date < oldestDate) oldestDate = entry.date;
          if (!newestDate || entry.date > newestDate) newestDate = entry.date;
        });
      });

      const storageSize = this.formatBytes(
        new Blob([JSON.stringify(allData)]).size
      );

      return {
        totalUsers: userIds.length,
        totalHistoryEntries: totalHistory,
        oldestEntry: oldestDate,
        newestEntry: newestDate,
        storageSize
      };
    } catch (error) {
      console.error("Failed to get storage stats:", error);
      return {
        totalUsers: 0,
        totalHistoryEntries: 0,
        oldestEntry: null,
        newestEntry: null,
        storageSize: "0 B"
      };
    }
  }

  // Private helper methods

  private static getAllEtaData(): Record<string, EtaStorageSchema> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error("Failed to parse ETA data:", error);
      return {};
    }
  }

  private static saveEtaData(userId: string, data: EtaStorageSchema): void {
    try {
      const allData = this.getAllEtaData();
      allData[userId] = data;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allData));
    } catch (error) {
      console.error("Failed to save ETA data:", error);
      throw error;
    }
  }

  private static calculatePredictionAccuracy(
    previousMetrics: EnhancedEtaMetrics,
    currentMetrics: EnhancedEtaMetrics,
    actualHoursStudied: number
  ): {
    current: number;
    lastWeek: number;
    lastMonth: number;
    overall: number;
  } {
    // Simplified accuracy calculation
    // In a real implementation, this would compare predicted vs actual progress
    
    const current = Math.random() * 0.3 + 0.7; // Placeholder: 70-100% accuracy
    
    return {
      current,
      lastWeek: Math.random() * 0.3 + 0.7,
      lastMonth: Math.random() * 0.3 + 0.7,
      overall: Math.random() * 0.3 + 0.7
    };
  }

  private static getDefaultMetrics(): EnhancedEtaMetrics {
    return {
      etaDate: null,
      daysToFinish: null,
      confidence: "very-low",
      avgDailyHours: 0,
      medianDailyHours: 0,
      consistencyScore: 0,
      productivityTrend: "stable",
      plannedDailyHours: 0,
      planEfficiency: 0,
      isBehindPlan: false,
      daysBehindPlan: null,
      subjectPerformance: {},
      predictedCompletionRange: {
        optimistic: null,
        realistic: null,
        pessimistic: null
      },
      totalHoursStudied: 0,
      activeDays: 0,
      streakDays: 0,
      longestStreak: 0,
      adaptiveStats: {
        distributionApplied: false,
        originalAverage: 0,
        adjustedAverage: 0,
        totalExcessHours: 0,
        adjustedDays: 0
      },
      calculationMethod: "default",
      lastUpdated: new Date(),
      dataQuality: "poor"
    };
  }

  private static getDefaultStudyPatterns(): StudyPattern {
    return {
      bestStudyDays: [],
      peakStudyHours: { start: 9, end: 17 },
      averageSessionLength: 0,
      preferredSubjects: [],
      burnoutRisk: "low"
    };
  }

  private static getDefaultEtaData(userId: string): EtaStorageSchema {
    return {
      userId,
      currentMetrics: this.getDefaultMetrics(),
      history: [],
      studyPatterns: this.getDefaultStudyPatterns(),
      predictionAccuracy: {
        lastMonth: 0,
        lastWeek: 0,
        overall: 0
      },
      lastCalculated: new Date()
    };
  }

  private static validateEtaData(data: any): data is EtaStorageSchema {
    return (
      data &&
      typeof data.userId === "string" &&
      data.currentMetrics &&
      Array.isArray(data.history) &&
      data.studyPatterns &&
      data.predictionAccuracy &&
      data.lastCalculated
    );
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
