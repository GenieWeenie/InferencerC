import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickReplyTemplatesProps {
    lastAssistantMessage: string;
    onSelectTemplate: (template: string) => void;
}

const QuickReplyTemplates: React.FC<QuickReplyTemplatesProps> = ({ lastAssistantMessage, onSelectTemplate }) => {
    const generateTemplates = (): string[] => {
        const templates: string[] = [];
        const content = lastAssistantMessage.toLowerCase();
        const hasCode = content.includes('```');
        const codeBlockCount = (lastAssistantMessage.match(/```/g) || []).length / 2;

        // Error or debugging context
        if (content.includes('error') || content.includes('bug') || content.includes('issue') || content.includes('problem')) {
            templates.push('How can I fix this?', 'What causes this error?', 'Can you show me the corrected version?');
        }
        // Code implementation
        else if (hasCode && (content.includes('here') || content.includes('example') || content.includes('implement'))) {
            templates.push('How does this work?', 'Can you add comments to explain?', 'What are potential issues with this approach?');
        }
        // Multiple code blocks or comparison
        else if (codeBlockCount > 1) {
            templates.push('Which approach is better?', 'Can you combine these?', 'What are the tradeoffs?');
        }
        // Tutorial/step-by-step
        else if ((content.includes('step') && (content.includes('1') || content.includes('first'))) ||
                 (content.includes('first') && content.includes('then'))) {
            templates.push('Can you walk me through this step-by-step?', 'What if I skip a step?', 'Can you show an example?');
        }
        // Lists or options
        else if ((content.match(/\d+\./g) || []).length >= 3 || content.includes('option') || content.includes('approach')) {
            templates.push('Which one do you recommend?', 'Can you compare the first two?', 'Tell me more about option 1');
        }
        // Explanation or concept
        else if (content.includes('because') || content.includes('reason') || content.includes('works by') ||
                 content.includes('this is') || content.includes('means that')) {
            templates.push('Can you give a practical example?', 'How would I use this?', 'What are common mistakes?');
        }
        // Installation or setup
        else if (content.includes('install') || content.includes('setup') || content.includes('configure')) {
            templates.push('What are the next steps?', 'Are there any prerequisites?', 'Can you show a complete example?');
        }
        // Best practices or recommendations
        else if (content.includes('recommend') || content.includes('should') || content.includes('best') || content.includes('better')) {
            templates.push('Why is this better?', 'What are the alternatives?', 'Can you show a before/after example?');
        }
        // General code presence
        else if (hasCode) {
            templates.push('Explain how this code works', 'How would I test this?', 'Can you add error handling?');
        }
        // Long responses
        else if (lastAssistantMessage.length > 800) {
            templates.push('Can you summarize this?', 'What\'s the main takeaway?', 'Give me a practical example');
        }
        // Short/simple responses
        else if (lastAssistantMessage.length < 200) {
            templates.push('Can you elaborate?', 'Give me more details', 'Show me an example');
        }
        // Fallback contextual prompts
        else {
            templates.push('Tell me more about this', 'Can you give an example?', 'What should I know next?');
        }

        // Return only first 3 unique templates
        return [...new Set(templates)].slice(0, 3);
    };

    const templates = generateTemplates();

    if (templates.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mt-3 flex flex-wrap gap-2"
        >
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Sparkles size={12} className="text-primary" />
                <span className="font-medium">Quick replies:</span>
            </div>
            {templates.map((template, index) => (
                <button
                    key={index}
                    onClick={() => onSelectTemplate(template)}
                    className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-primary/50 rounded-lg text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5 group"
                >
                    <MessageSquare size={11} className="text-slate-500 group-hover:text-primary transition-colors" />
                    <span>{template}</span>
                </button>
            ))}
        </motion.div>
    );
};

export default QuickReplyTemplates;
