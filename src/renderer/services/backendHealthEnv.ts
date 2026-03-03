export function getAllowBrowserProbe(): boolean {
    return (
        typeof import.meta !== 'undefined' &&
        import.meta.env?.VITE_ALLOW_BROWSER_BACKEND_PROBE === 'true'
    );
}
