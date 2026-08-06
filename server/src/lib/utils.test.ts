import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('utils - cn()', () => {
    it('should correctly merge tailwind classes', () => {
        const result = cn('bg-red-500', 'text-white', 'p-4');
        expect(result).toBe('bg-red-500 text-white p-4');
    });

    it('should handle conditional classes using clsx', () => {
        const isActive = true;
        const isDisabled = false;

        const result = cn(
            'base-class',
            isActive && 'active-class',
            isDisabled && 'disabled-class',
            { 'object-class': true }
        );

        expect(result).toBe('base-class active-class object-class');
    });

    it('should override tailwind classes intelligently using tailwind-merge', () => {
        const result = cn('px-2 py-1 bg-red-500', 'p-4 bg-blue-500');
        // 'p-4' overrides 'px-2 py-1', 'bg-blue-500' overrides 'bg-red-500'
        expect(result).toBe('p-4 bg-blue-500');
    });
});
