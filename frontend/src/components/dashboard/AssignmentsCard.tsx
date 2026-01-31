import React from 'react';
import type { Assignment } from '../../types';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface AssignmentsCardProps {
  assignments: Assignment[];
}

const AssignmentsCard: React.FC<AssignmentsCardProps> = ({ assignments }) => {
  const getDaysUntil = (dateStr: string) => {
    const targetDate = new Date(dateStr);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPriorityClass = (priority: string) => {
    return priority === 'high' ? 'priority-high' : 'priority-medium';
  };

  return (
    <section className="card assignments-card">
      <div className="card-header">
        <h2 className="card-title">Upcoming Assignments</h2>
        <Calendar size={20} className="header-icon" />
      </div>
      
      <div className="assignments-list">
        {assignments.map(assignment => {
          const daysUntil = getDaysUntil(assignment.date);
          const isUrgent = daysUntil <= 7;
          
          return (
            <div 
              key={assignment.id} 
              className={`assignment-item ${getPriorityClass(assignment.priority)} ${isUrgent ? 'urgent' : ''}`}
            >
              <div className="assignment-left">
                {isUrgent && <AlertCircle size={18} className="urgency-icon" />}
                <div className="assignment-info">
                  <div className="assignment-title">{assignment.title}</div>
                  <div className="assignment-meta">
                    <Clock size={12} />
                    <span>{assignment.date}</span>
                  </div>
                </div>
              </div>
              <div className="assignment-days">
                <div className="days-number">{daysUntil}</div>
                <div className="days-label">days</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AssignmentsCard;