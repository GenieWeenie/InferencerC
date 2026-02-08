/**
 * Calendar Schedule Dialog
 *
 * UI for scheduling conversation reminders
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { calendarService } from '../services/calendar';
import { toast } from 'sonner';

interface CalendarScheduleDialogProps {
    isOpen: boolean;
    onClose: () => void;
    conversationTitle: string;
    conversationSummary?: string;
}

export const CalendarScheduleDialog: React.FC<CalendarScheduleDialogProps> = ({
    isOpen,
    onClose,
    conversationTitle,
    conversationSummary,
}) => {
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);

    const handleSchedule = async () => {
        if (!scheduledDate || !scheduledTime) {
            toast.error('Please select both date and time');
            return;
        }

        setIsScheduling(true);
        try {
            const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
            if (isNaN(dateTime.getTime())) {
                toast.error('Invalid date/time');
                return;
            }

            const result = await calendarService.scheduleConversationReminder(
                conversationTitle,
                dateTime,
                conversationSummary
            );

            if (result.success) {
                toast.success('Reminder scheduled!');
                onClose();
            } else {
                toast.error(result.error || 'Failed to schedule reminder');
            }
        } catch (error) {
            console.error('Schedule error:', error);
            toast.error('Failed to schedule reminder');
        } finally {
            setIsScheduling(false);
        }
    };

    if (!isOpen) return null;

    // Set default to tomorrow at 9 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDate = scheduledDate || tomorrow.toISOString().split('T')[0];
    const defaultTime = scheduledTime || '09:00';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-md bg-slate-900 rounded-lg shadow-2xl border border-slate-700 p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <CalendarIcon className="w-5 h-5 text-green-400" />
                            <h3 className="text-xl font-bold text-white">Schedule Reminder</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Conversation
                            </label>
                            <p className="text-sm text-slate-400 bg-slate-800 rounded-lg p-3">
                                {conversationTitle}
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4" />
                                Date
                            </label>
                            <input
                                type="date"
                                value={scheduledDate || defaultDate}
                                onChange={(e) => setScheduledDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Time
                            </label>
                            <input
                                type="time"
                                value={scheduledTime || defaultTime}
                                onChange={(e) => setScheduledTime(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-green-500 outline-none"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSchedule}
                                disabled={isScheduling || !scheduledDate || !scheduledTime}
                                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isScheduling ? 'Scheduling...' : 'Schedule'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
