import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export const Textarea = ({ label, className = '', ...props }: TextareaProps) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                    {label}
                </label>
            )}
            <textarea
                className={`flex min-h-[100px] w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
                {...props}
            />
        </div>
    );
};
