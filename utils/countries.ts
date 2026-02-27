export const getCountryFlag = (country: string) => {
    const flags: Record<string, { flag: string, name: string }> = {
        'Japan': { flag: '🇯🇵', name: '日本' },
        'USA': { flag: '🇺🇸', name: '美國' },
        'Korea': { flag: '🇰🇷', name: '韓國' },
        'Taiwan': { flag: '🇹🇼', name: '台灣' },
        'Thailand': { flag: '🇹🇭', name: '泰國' },
        'France': { flag: '🇫🇷', name: '法國' },
    };
    return flags[country] || { flag: '📍', name: country };
};
