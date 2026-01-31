import React from 'react';
import type { Note } from '../../types';
import { Check, Flame, Award } from 'lucide-react';

interface NotesCardProps {
  notes: Note[];
  onNoteClick: (id: number) => void;
  onNoteToggle: (id: number) => void;
  currentStreak: number;
  longestStreak: number;
}

const NotesCard: React.FC<NotesCardProps> = ({ 
  notes, 
  onNoteClick, 
  onNoteToggle,
  currentStreak,
  longestStreak 
}) => {
  const completedCount = notes.filter(n => n.completed).length;
  const totalCount = notes.length;

  return (
    <section className="card notes-card">
      <div className="card-header">
        <h2 className="card-title">Notes for Revision</h2>
        <div className="streak-badges">
          <div className="streak-badge current">
            <Flame size={16} />
            <span>{currentStreak}</span>
          </div>
          <div className="streak-badge best">
            <Award size={16} />
            <span>{longestStreak}</span>
          </div>
        </div>
      </div>

      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>
      
      <div className="notes-list">
        {notes.map(note => (
          <div
            key={note.id}
            className={`note-item ${note.completed ? 'completed' : ''}`}
          >
            <div 
              className={`checkbox ${note.completed ? 'checked' : ''}`}
              onClick={() => onNoteToggle(note.id)}
            >
              {note.completed && <Check size={14} strokeWidth={3} />}
            </div>
            <div 
              className="note-content"
              onClick={() => onNoteClick(note.id)}
            >
              <div className="note-title">{note.title}</div>
              <div className="note-subject">{note.subject}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default NotesCard;