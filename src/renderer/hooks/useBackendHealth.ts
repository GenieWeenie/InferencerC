import { useEffect, useState } from 'react';
import { backendHealthService, BackendHealthState } from '../services/backendHealth';

export const useBackendHealth = (): BackendHealthState => {
    const [state, setState] = useState<BackendHealthState>(() => backendHealthService.getState());

    useEffect(() => {
        return backendHealthService.subscribe(setState);
    }, []);

    return state;
};
