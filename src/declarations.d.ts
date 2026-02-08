declare module '*.worker?worker' {
    class WebpackWorker extends Worker {
        constructor();
    }

    export default WebpackWorker;
}

// Vite import.meta extensions
interface ImportMeta {
    url: string;
    env: {
        MODE: string;
        BASE_URL: string;
        PROD: boolean;
        DEV: boolean;
        SSR: boolean;
        [key: string]: string | boolean | undefined;
    };
}
