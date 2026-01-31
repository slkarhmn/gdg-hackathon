import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import type { HeatmapData } from '../../types';

interface HeatmapProps {
  data: HeatmapData;
  currentYear: number;
}

const Heatmap: React.FC<HeatmapProps> = ({ data, currentYear }) => {
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // GitHub-style colors: light (less) to dark (more)
  const getHeatColor = (value: number) => {
    const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
    return colors[value] || colors[0];
  };

  // Generate full year data (12 months)
  const generateFullYearData = () => {
    const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullYearData: { [key: string]: number[] } = {};
    
    days.forEach(day => {
      // 52 weeks * 12 months ≈ 52 cells for full year view
      fullYearData[day] = Array(52).fill(0).map(() => Math.floor(Math.random() * 5));
    });
    
    return { months: allMonths, days, data: fullYearData };
  };

  const fullYearData = generateFullYearData();
  
  const totalReviews = Object.values(fullYearData.data)
    .flat()
    .reduce((sum, val) => sum + val, 0);

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
                  {fullYearData.data[day].map((value, cellIdx) => (
                    <div
                      key={cellIdx}
                      className="heatmap-cell"
                      style={{ backgroundColor: getHeatColor(value) }}
                      title={`${day}: ${value} reviews`}
                    />
                  ))}
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