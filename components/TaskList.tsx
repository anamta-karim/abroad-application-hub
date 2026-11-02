"use client";

import { useState } from "react";
import {
  addTaskAction,
  toggleTaskAction,
  deleteTaskAction,
} from "@/app/app/applications/actions";
import type { TaskStatus } from "@/types/database";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
}

interface TaskListProps {
  applicationId: string;
  initialTasks: TaskItem[];
}

export function TaskList({ applicationId, initialTasks }: TaskListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = async (taskId: string, currentStatus: TaskStatus) => {
    await toggleTaskAction(taskId, applicationId, currentStatus);
  };

  const handleDelete = async (taskId: string) => {
    await deleteTaskAction(taskId, applicationId);
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    await addTaskAction(applicationId, formData);
    setIsSubmitting(false);
    setShowAddForm(false);
  };

  const completedCount = initialTasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-glass-borderSubtle">
        <div>
          <h2 className="font-heading font-bold text-lg text-ink-deep">
            Tasks &amp; Action Items
          </h2>
          <p className="text-xs text-ink-muted mt-0.5">
            {initialTasks.length > 0
              ? `${completedCount} of ${initialTasks.length} tasks completed`
              : "No tasks logged yet"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3.5 py-1.5 text-xs font-bold text-brand hover:text-brand-dark glass-input rounded-xl hover:bg-white transition-colors cursor-pointer"
        >
          {showAddForm ? "Cancel" : "+ Add Task"}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="glass-card rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-ink-deep font-heading">
              Task Title <span className="text-brand">*</span>
            </label>
            <input
              name="title"
              type="text"
              required
              placeholder="e.g. Request recommendation from Prof. Smith"
              className="w-full h-10 px-3.5 text-xs glass-input rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink-deep font-heading">
                Due Date (optional)
              </label>
              <input
                name="dueDate"
                type="date"
                className="w-full h-10 px-3.5 text-xs glass-input rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-ink-deep font-heading">
                Notes
              </label>
              <input
                name="description"
                type="text"
                placeholder="Optional context"
                className="w-full h-10 px-3.5 text-xs glass-input rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark rounded-xl shadow-sm transition-all"
            >
              {isSubmitting ? "Adding..." : "Add Task"}
            </button>
          </div>
        </form>
      )}

      {initialTasks.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center text-xs text-ink-muted">
          <p className="font-semibold text-ink-deep">No pending tasks for this application.</p>
          <p className="text-ink-subtle mt-1">
            Keep track of follow-ups, professor outreach, and fee payments here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {initialTasks.map((task) => {
            const isDone = task.status === "done";
            return (
              <div
                key={task.id}
                className="glass-card rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => handleToggle(task.id, task.status)}
                    className="w-4 h-4 rounded border-glass-border text-brand focus:ring-brand cursor-pointer"
                  />
                  <div>
                    <span
                      className={`font-semibold text-ink-deep block truncate ${
                        isDone ? "line-through text-ink-subtle" : ""
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.description && (
                      <span className="text-[11px] text-ink-muted block truncate">
                        {task.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {task.due_date && (
                    <span className="text-[10px] text-ink-muted">
                      Due: {task.due_date}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(task.id)}
                    className="text-xs text-ink-subtle hover:text-red-600 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                    title="Delete task"
                  >
                    &times;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
