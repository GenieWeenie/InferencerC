"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebService = void 0;
const turndown_1 = __importDefault(require("turndown"));
const validator_1 = __importDefault(require("validator"));
class WebService {
    turndown = new turndown_1.default();
    constructor() {
        // Configure turndown to be cleaner
        this.turndown.remove(['script', 'style', 'noscript', 'iframe', 'header', 'footer', 'nav']);
    }
    /**
     * Validates and sanitizes a URL before fetching
     * @param url The URL to validate
     * @returns boolean indicating if the URL is valid
     */
    isValidUrl(url) {
        // Basic validation to prevent malicious URLs
        if (!validator_1.default.isURL(url, {
            protocols: ['http', 'https'],
            require_protocol: true,
            require_valid_protocol: true
        })) {
            return false;
        }
        // Prevent local file access and other potentially harmful schemes
        const parsedUrl = new URL(url);
        const host = parsedUrl.hostname.toLowerCase();
        // Block localhost, private IPs, and other potentially dangerous hosts
        if (host === 'localhost' ||
            host.startsWith('127.') ||
            host.startsWith('10.') ||
            host.startsWith('192.168.') ||
            host.startsWith('0.') ||
            host === '::1' ||
            host.startsWith('[::')) {
            return false;
        }
        return true;
    }
    async fetchUrl(url) {
        // Validate URL before processing
        if (!this.isValidUrl(url)) {
            throw new Error(`Invalid URL: ${url}`);
        }
        try {
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(`HTTP ${response.status}`);
            // Limit response size to prevent large payloads
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Could not read response body');
            }
            let html = '';
            let totalSize = 0;
            const maxSize = 10 * 1024 * 1024; // 10MB limit
            while (totalSize < maxSize) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                const chunk = new TextDecoder().decode(value);
                html += chunk;
                totalSize += chunk.length;
                if (totalSize >= maxSize) {
                    throw new Error('Response exceeds maximum allowed size');
                }
            }
            // Basic cleaning: extract body or just convert the whole thing
            // (Advanced: use JSDOM to extract main content/article only)
            const markdown = this.turndown.turndown(html);
            // Limit size to avoid context overflow (e.g. 10k chars)
            return markdown.slice(0, 15000);
        }
        catch (err) {
            throw new Error(`Failed to fetch ${url}: ${err.message}`);
        }
    }
}
exports.WebService = WebService;
//# sourceMappingURL=web.js.map