import React from 'react';
import type { TodoItem } from '../../types';
import { Check } from 'lucide-react';

interface TodoListProps {
  todos: TodoItem[];
  onTodoToggle: (id: number) => void;
}

const TodoList: React.FC<TodoListProps> = ({ todos, onTodoToggle }) => {
  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;

  return (
    <section className="card todo-card">
      <div className="card-header">
        <h2 className="card-title">To do List for Today</h2>
        <div className="progress-indicator">
          {completedCount}/{totalCount}
        </div>
      </div>
      
      <div className="todo-list">
        {todos.map((todo) => (
          <div
            key={todo.id}
            className={`todo-item ${todo.completed ? 'completed' : ''}`}
            onClick={() => onTodoToggle(todo.id)}
          >
            <div className={`checkbox ${todo.completed ? 'checked' : ''}`}>
              {todo.completed && <Check size={16} strokeWidth={3} />}
            </div>
            <span className="todo-text">{todo.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TodoList;