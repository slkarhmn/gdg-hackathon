import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import type { HeatmapData } from '../../types';
import {
  toHeatmapData,
  getTotalReviews,
  fetchHeatmapCounts,
  heatmapDataFromDailyCounts,
} from '../../api';
import { DEFAULT_USER_ID } from '../../api/config';
import type { BackendSpacedRepetition } from '../../api';

interface HeatmapProps {
  data: HeatmapData;
  currentYear: number;
  spacedReps?: BackendSpacedRepetition[];
}

// Map repetition count to color level 0–4 (dynamic scale so max count = darkest)
function getHeatLevel(count: number, maxCount: number): number {
  if (count === 0) return 0;
  if (maxCount <= 0) return 0;
  if (maxCount === 1) return count >= 1 ? 4 : 0;
  // Spread 1..maxCount across levels 1–4
  const level = Math.min(4, 1 + Math.floor((count - 1) * 4 / (maxCount - 1)));
  return Math.max(1, level);
}

const Heatmap: React.FC<HeatmapProps> = ({ data, currentYear, spacedReps = [] }) => {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [heatmapDataByYear, setHeatmapDataByYear] = useState<Record<number, HeatmapData>>({});

  // When year changes, fetch heatmap counts from the dedicated endpoint
  useEffect(() => {
    let cancelled = false;
    fetchHeatmapCounts(DEFAULT_USER_ID, selectedYear)
      .then((res) => {
        if (!cancelled) {
          setHeatmapDataByYear((prev) => ({
            ...prev,
            [res.year]: heatmapDataFromDailyCounts(res.daily_counts, res.year),
          }));
        }
      })
      .catch(() => {
        // Keep using fallback (toHeatmapData / data / placeholder)
      });
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  // GitHub-style colors: light (less) to dark (more repetitions)
  const getHeatColor = (level: number) => {
    const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
    return colors[level] ?? colors[0];
  };

  // Prefer API heatmap data for selected year; fallback to spacedReps, then props, then placeholder
  const fullYearData = useMemo(() => {
    if (heatmapDataByYear[selectedYear]) {
      return heatmapDataByYear[selectedYear];
    }
    if (spacedReps && spacedReps.length > 0) {
      return toHeatmapData(spacedReps, selectedYear);
    }
    if (data && Object.keys(data.data).length > 0) {
      return data;
    }
    const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const placeholderData: { [key: string]: number[] } = {};
    days.forEach((day) => {
      placeholderData[day] = Array(52).fill(0);
    });
    return { months: allMonths, days, data: placeholderData };
  }, [heatmapDataByYear, selectedYear, spacedReps, data]);
  
  const totalReviews = useMemo(() => {
    if (spacedReps && spacedReps.length > 0) {
      return getTotalReviews(spacedReps);
    }
    return Object.values(fullYearData.data)
      .flat()
      .reduce((sum, val) => sum + val, 0);
  }, [spacedReps, fullYearData]);

  // Max count in the grid for dynamic color scale (more repetitions = darker)
  const maxCount = useMemo(() => {
    const counts = Object.values(fullYearData.data).flat();
    return counts.length ? Math.max(...counts) : 0;
  }, [fullYearData]);

  const handlePrevYear = () => {
    setSelectedYear(selectedYear - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(selectedYear + 1);
  };

  return (
    <section className="heatmap-section">
      <div className="heatmap-container">
        <div className="heatmap-header">
          <div className="heatmap-title-section">
            <h3 className="heatmap-title">Spaced Repetition Tracker</h3>
            <p className="heatmap-subtitle">Track your consistent revision pattern</p>
          </div>
          <div className="heatmap-stats">
            <div className="stat-item">
              <TrendingUp size={20} />
              <div className="stat-content">
                <div className="stat-value">{totalReviews}</div>
                <div className="stat-label">Total Reviews</div>
              </div>
            </div>
          </div>
        </div>

        <div className="heatmap-controls">
          <button className="heatmap-btn" onClick={handlePrevYear}>
            <ChevronLeft size={18} />
          </button>
          <span className="heatmap-year">{selectedYear}</span>
          <button className="heatmap-btn" onClick={handleNextYear}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="heatmap-grid">
          <div className="heatmap-months">
            {fullYearData.months.map((month, idx) => (
              <div key={idx} className="month-label">{month}</div>
            ))}
          </div>

          <div className="heatmap-body">
            <div className="heatmap-days">
              {fullYearData.days.map(day => (
                <div key={day} className="day-label">{day.slice(0, 3)}</div>
              ))}
            </div>

            <div className="heatmap-cells">
              {fullYearData.days.map((day) => (
                <div key={day} className="day-row">
                  {fullYearData.data[day].map((count, cellIdx) => {
                    const level = getHeatLevel(count, maxCount);
                    return (
                      <div
                        key={cellIdx}
                        className="heatmap-cell"
                        style={{ backgroundColor: getHeatColor(level) }}
                        title={count > 0 ? `${day}: ${count} repetition${count !== 1 ? 's' : ''}` : 'No repetitions'}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="heatmap-footer">
          <span className="heatmap-description">
            Consistency is key to retention
          </span>
          <div className="heatmap-legend">
            <span className="legend-label">Less</span>
            <div className="legend-colors">
              <div className="legend-color" style={{ backgroundColor: '#ebedf0' }} />
              <div className="legend-color" style={{ backgroundColor: '#9be9a8' }} />
              <div className="legend-color" style={{ backgroundColor: '#40c463' }} />
              <div className="legend-color" style={{ backgroundColor: '#30a14e' }} />
              <div className="legend-color" style={{ backgroundColor: '#216e39' }} />
            </div>
            <span className="legend-label">More</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Heatmap;