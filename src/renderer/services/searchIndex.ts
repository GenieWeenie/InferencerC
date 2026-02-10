/**
 * Search Index Service
 * 
 * Manages an inverted index for fast keyword lookups across conversations.
 * Optimizes search by mapping terms to session IDs.
 */

import { ChatSession } from '../../shared/types';

interface InvertedIndex {
    version: number;
    updatedAt: number;
    terms: Record<string, string[]>; // term -> sessionIds
    sessionTerms: Record<string, string[]>; // sessionId -> terms
}

type SearchIndexBatchOperation =
    | { kind: 'upsert'; session: ChatSession }
    | { kind: 'delete'; sessionId: string };

const INDEX_STORAGE_KEY = 'app_search_index';
const TOKEN_CACHE_LIMIT = 512;
const QUERY_TERM_CACHE_LIMIT = 256;
const POSTING_SET_CACHE_LIMIT = 1024;
const EMPTY_TERMS: string[] = [];
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'have', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
    'she', 'that', 'the', 'this', 'to', 'was', 'were', 'will', 'with',
    'you', 'your', 'i', 'me', 'my', 'we', 'our', 'they', 'their',
    'what', 'which', 'who', 'whom', 'whose', 'why', 'how'
]);
let indexCache: InvertedIndex | null = null;
let indexCacheRaw: string | null = null;
const tokenizeCache = new Map<string, string[]>();
const queryTermCache = new Map<string, string[]>();
const postingSetCache = new Map<string, { idsRef: string[]; idsSet: Set<string> }>();
const remainingTermSetScratch: Set<string>[] = [];

const createEmptyIndex = (): InvertedIndex => ({
    version: 1,
    updatedAt: Date.now(),
    terms: {},
    sessionTerms: {},
});

const hasSameTerms = (previousTerms: string[], nextTerms: Set<string>): boolean => {
    if (previousTerms.length !== nextTerms.size) {
        return false;
    }
    for (let i = 0; i < previousTerms.length; i++) {
        if (!nextTerms.has(previousTerms[i])) {
            return false;
        }
    }
    return true;
};

const cacheTokenized = (text: string, tokens: string[]): void => {
    tokenizeCache.delete(text);
    tokenizeCache.set(text, tokens);
    if (tokenizeCache.size > TOKEN_CACHE_LIMIT) {
        const oldestKey = tokenizeCache.keys().next().value;
        if (oldestKey !== undefined) {
            tokenizeCache.delete(oldestKey);
        }
    }
};

const cacheQueryTerms = (query: string, terms: string[]): void => {
    queryTermCache.delete(query);
    queryTermCache.set(query, terms);
    if (queryTermCache.size > QUERY_TERM_CACHE_LIMIT) {
        const oldestKey = queryTermCache.keys().next().value;
        if (oldestKey !== undefined) {
            queryTermCache.delete(oldestKey);
        }
    }
};

const getUniqueQueryTerms = (query: string): string[] => {
    const cached = queryTermCache.get(query);
    if (cached) {
        return cached;
    }

    const tokens = SearchIndexService.tokenize(query);
    if (tokens.length <= 1) {
        cacheQueryTerms(query, tokens);
        return tokens;
    }
    if (tokens.length === 2) {
        if (tokens[0] === tokens[1]) {
            const deduped = [tokens[0]];
            cacheQueryTerms(query, deduped);
            return deduped;
        }
        cacheQueryTerms(query, tokens);
        return tokens;
    }
    if (tokens.length === 3) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        let deduped: string[];

        if (first === second) {
            deduped = first === third ? [first] : [first, third];
        } else if (first === third) {
            deduped = [first, second];
        } else if (second === third) {
            deduped = [first, second];
        } else {
            deduped = tokens;
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 4) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 5) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 6) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 7) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 8) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 9) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 10) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 11) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 12) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 13) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 14) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 15) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 16) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 17) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 18) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 19) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 20) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 21) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 22) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 23) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const twentyThird = tokens[22];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }
        if (twentyThird !== first && twentyThird !== second && twentyThird !== third && twentyThird !== fourth && twentyThird !== fifth && twentyThird !== sixth && twentyThird !== seventh && twentyThird !== eighth && twentyThird !== ninth && twentyThird !== tenth && twentyThird !== eleventh && twentyThird !== twelfth && twentyThird !== thirteenth && twentyThird !== fourteenth && twentyThird !== fifteenth && twentyThird !== sixteenth && twentyThird !== seventeenth && twentyThird !== eighteenth && twentyThird !== nineteenth && twentyThird !== twentieth && twentyThird !== twentyFirst && twentyThird !== twentySecond) {
            deduped.push(twentyThird);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 24) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const twentyThird = tokens[22];
        const twentyFourth = tokens[23];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }
        if (twentyThird !== first && twentyThird !== second && twentyThird !== third && twentyThird !== fourth && twentyThird !== fifth && twentyThird !== sixth && twentyThird !== seventh && twentyThird !== eighth && twentyThird !== ninth && twentyThird !== tenth && twentyThird !== eleventh && twentyThird !== twelfth && twentyThird !== thirteenth && twentyThird !== fourteenth && twentyThird !== fifteenth && twentyThird !== sixteenth && twentyThird !== seventeenth && twentyThird !== eighteenth && twentyThird !== nineteenth && twentyThird !== twentieth && twentyThird !== twentyFirst && twentyThird !== twentySecond) {
            deduped.push(twentyThird);
        }
        if (twentyFourth !== first && twentyFourth !== second && twentyFourth !== third && twentyFourth !== fourth && twentyFourth !== fifth && twentyFourth !== sixth && twentyFourth !== seventh && twentyFourth !== eighth && twentyFourth !== ninth && twentyFourth !== tenth && twentyFourth !== eleventh && twentyFourth !== twelfth && twentyFourth !== thirteenth && twentyFourth !== fourteenth && twentyFourth !== fifteenth && twentyFourth !== sixteenth && twentyFourth !== seventeenth && twentyFourth !== eighteenth && twentyFourth !== nineteenth && twentyFourth !== twentieth && twentyFourth !== twentyFirst && twentyFourth !== twentySecond && twentyFourth !== twentyThird) {
            deduped.push(twentyFourth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 25) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const twentyThird = tokens[22];
        const twentyFourth = tokens[23];
        const twentyFifth = tokens[24];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }
        if (twentyThird !== first && twentyThird !== second && twentyThird !== third && twentyThird !== fourth && twentyThird !== fifth && twentyThird !== sixth && twentyThird !== seventh && twentyThird !== eighth && twentyThird !== ninth && twentyThird !== tenth && twentyThird !== eleventh && twentyThird !== twelfth && twentyThird !== thirteenth && twentyThird !== fourteenth && twentyThird !== fifteenth && twentyThird !== sixteenth && twentyThird !== seventeenth && twentyThird !== eighteenth && twentyThird !== nineteenth && twentyThird !== twentieth && twentyThird !== twentyFirst && twentyThird !== twentySecond) {
            deduped.push(twentyThird);
        }
        if (twentyFourth !== first && twentyFourth !== second && twentyFourth !== third && twentyFourth !== fourth && twentyFourth !== fifth && twentyFourth !== sixth && twentyFourth !== seventh && twentyFourth !== eighth && twentyFourth !== ninth && twentyFourth !== tenth && twentyFourth !== eleventh && twentyFourth !== twelfth && twentyFourth !== thirteenth && twentyFourth !== fourteenth && twentyFourth !== fifteenth && twentyFourth !== sixteenth && twentyFourth !== seventeenth && twentyFourth !== eighteenth && twentyFourth !== nineteenth && twentyFourth !== twentieth && twentyFourth !== twentyFirst && twentyFourth !== twentySecond && twentyFourth !== twentyThird) {
            deduped.push(twentyFourth);
        }
        if (twentyFifth !== first && twentyFifth !== second && twentyFifth !== third && twentyFifth !== fourth && twentyFifth !== fifth && twentyFifth !== sixth && twentyFifth !== seventh && twentyFifth !== eighth && twentyFifth !== ninth && twentyFifth !== tenth && twentyFifth !== eleventh && twentyFifth !== twelfth && twentyFifth !== thirteenth && twentyFifth !== fourteenth && twentyFifth !== fifteenth && twentyFifth !== sixteenth && twentyFifth !== seventeenth && twentyFifth !== eighteenth && twentyFifth !== nineteenth && twentyFifth !== twentieth && twentyFifth !== twentyFirst && twentyFifth !== twentySecond && twentyFifth !== twentyThird && twentyFifth !== twentyFourth) {
            deduped.push(twentyFifth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 26) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const twentyThird = tokens[22];
        const twentyFourth = tokens[23];
        const twentyFifth = tokens[24];
        const twentySixth = tokens[25];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }
        if (twentyThird !== first && twentyThird !== second && twentyThird !== third && twentyThird !== fourth && twentyThird !== fifth && twentyThird !== sixth && twentyThird !== seventh && twentyThird !== eighth && twentyThird !== ninth && twentyThird !== tenth && twentyThird !== eleventh && twentyThird !== twelfth && twentyThird !== thirteenth && twentyThird !== fourteenth && twentyThird !== fifteenth && twentyThird !== sixteenth && twentyThird !== seventeenth && twentyThird !== eighteenth && twentyThird !== nineteenth && twentyThird !== twentieth && twentyThird !== twentyFirst && twentyThird !== twentySecond) {
            deduped.push(twentyThird);
        }
        if (twentyFourth !== first && twentyFourth !== second && twentyFourth !== third && twentyFourth !== fourth && twentyFourth !== fifth && twentyFourth !== sixth && twentyFourth !== seventh && twentyFourth !== eighth && twentyFourth !== ninth && twentyFourth !== tenth && twentyFourth !== eleventh && twentyFourth !== twelfth && twentyFourth !== thirteenth && twentyFourth !== fourteenth && twentyFourth !== fifteenth && twentyFourth !== sixteenth && twentyFourth !== seventeenth && twentyFourth !== eighteenth && twentyFourth !== nineteenth && twentyFourth !== twentieth && twentyFourth !== twentyFirst && twentyFourth !== twentySecond && twentyFourth !== twentyThird) {
            deduped.push(twentyFourth);
        }
        if (twentyFifth !== first && twentyFifth !== second && twentyFifth !== third && twentyFifth !== fourth && twentyFifth !== fifth && twentyFifth !== sixth && twentyFifth !== seventh && twentyFifth !== eighth && twentyFifth !== ninth && twentyFifth !== tenth && twentyFifth !== eleventh && twentyFifth !== twelfth && twentyFifth !== thirteenth && twentyFifth !== fourteenth && twentyFifth !== fifteenth && twentyFifth !== sixteenth && twentyFifth !== seventeenth && twentyFifth !== eighteenth && twentyFifth !== nineteenth && twentyFifth !== twentieth && twentyFifth !== twentyFirst && twentyFifth !== twentySecond && twentyFifth !== twentyThird && twentyFifth !== twentyFourth) {
            deduped.push(twentyFifth);
        }
        if (twentySixth !== first && twentySixth !== second && twentySixth !== third && twentySixth !== fourth && twentySixth !== fifth && twentySixth !== sixth && twentySixth !== seventh && twentySixth !== eighth && twentySixth !== ninth && twentySixth !== tenth && twentySixth !== eleventh && twentySixth !== twelfth && twentySixth !== thirteenth && twentySixth !== fourteenth && twentySixth !== fifteenth && twentySixth !== sixteenth && twentySixth !== seventeenth && twentySixth !== eighteenth && twentySixth !== nineteenth && twentySixth !== twentieth && twentySixth !== twentyFirst && twentySixth !== twentySecond && twentySixth !== twentyThird && twentySixth !== twentyFourth && twentySixth !== twentyFifth) {
            deduped.push(twentySixth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 27) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const twentyThird = tokens[22];
        const twentyFourth = tokens[23];
        const twentyFifth = tokens[24];
        const twentySixth = tokens[25];
        const twentySeventh = tokens[26];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }
        if (twentyThird !== first && twentyThird !== second && twentyThird !== third && twentyThird !== fourth && twentyThird !== fifth && twentyThird !== sixth && twentyThird !== seventh && twentyThird !== eighth && twentyThird !== ninth && twentyThird !== tenth && twentyThird !== eleventh && twentyThird !== twelfth && twentyThird !== thirteenth && twentyThird !== fourteenth && twentyThird !== fifteenth && twentyThird !== sixteenth && twentyThird !== seventeenth && twentyThird !== eighteenth && twentyThird !== nineteenth && twentyThird !== twentieth && twentyThird !== twentyFirst && twentyThird !== twentySecond) {
            deduped.push(twentyThird);
        }
        if (twentyFourth !== first && twentyFourth !== second && twentyFourth !== third && twentyFourth !== fourth && twentyFourth !== fifth && twentyFourth !== sixth && twentyFourth !== seventh && twentyFourth !== eighth && twentyFourth !== ninth && twentyFourth !== tenth && twentyFourth !== eleventh && twentyFourth !== twelfth && twentyFourth !== thirteenth && twentyFourth !== fourteenth && twentyFourth !== fifteenth && twentyFourth !== sixteenth && twentyFourth !== seventeenth && twentyFourth !== eighteenth && twentyFourth !== nineteenth && twentyFourth !== twentieth && twentyFourth !== twentyFirst && twentyFourth !== twentySecond && twentyFourth !== twentyThird) {
            deduped.push(twentyFourth);
        }
        if (twentyFifth !== first && twentyFifth !== second && twentyFifth !== third && twentyFifth !== fourth && twentyFifth !== fifth && twentyFifth !== sixth && twentyFifth !== seventh && twentyFifth !== eighth && twentyFifth !== ninth && twentyFifth !== tenth && twentyFifth !== eleventh && twentyFifth !== twelfth && twentyFifth !== thirteenth && twentyFifth !== fourteenth && twentyFifth !== fifteenth && twentyFifth !== sixteenth && twentyFifth !== seventeenth && twentyFifth !== eighteenth && twentyFifth !== nineteenth && twentyFifth !== twentieth && twentyFifth !== twentyFirst && twentyFifth !== twentySecond && twentyFifth !== twentyThird && twentyFifth !== twentyFourth) {
            deduped.push(twentyFifth);
        }
        if (twentySixth !== first && twentySixth !== second && twentySixth !== third && twentySixth !== fourth && twentySixth !== fifth && twentySixth !== sixth && twentySixth !== seventh && twentySixth !== eighth && twentySixth !== ninth && twentySixth !== tenth && twentySixth !== eleventh && twentySixth !== twelfth && twentySixth !== thirteenth && twentySixth !== fourteenth && twentySixth !== fifteenth && twentySixth !== sixteenth && twentySixth !== seventeenth && twentySixth !== eighteenth && twentySixth !== nineteenth && twentySixth !== twentieth && twentySixth !== twentyFirst && twentySixth !== twentySecond && twentySixth !== twentyThird && twentySixth !== twentyFourth && twentySixth !== twentyFifth) {
            deduped.push(twentySixth);
        }
        if (twentySeventh !== first && twentySeventh !== second && twentySeventh !== third && twentySeventh !== fourth && twentySeventh !== fifth && twentySeventh !== sixth && twentySeventh !== seventh && twentySeventh !== eighth && twentySeventh !== ninth && twentySeventh !== tenth && twentySeventh !== eleventh && twentySeventh !== twelfth && twentySeventh !== thirteenth && twentySeventh !== fourteenth && twentySeventh !== fifteenth && twentySeventh !== sixteenth && twentySeventh !== seventeenth && twentySeventh !== eighteenth && twentySeventh !== nineteenth && twentySeventh !== twentieth && twentySeventh !== twentyFirst && twentySeventh !== twentySecond && twentySeventh !== twentyThird && twentySeventh !== twentyFourth && twentySeventh !== twentyFifth && twentySeventh !== twentySixth) {
            deduped.push(twentySeventh);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 28) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const twentyThird = tokens[22];
        const twentyFourth = tokens[23];
        const twentyFifth = tokens[24];
        const twentySixth = tokens[25];
        const twentySeventh = tokens[26];
        const twentyEighth = tokens[27];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }
        if (twentyThird !== first && twentyThird !== second && twentyThird !== third && twentyThird !== fourth && twentyThird !== fifth && twentyThird !== sixth && twentyThird !== seventh && twentyThird !== eighth && twentyThird !== ninth && twentyThird !== tenth && twentyThird !== eleventh && twentyThird !== twelfth && twentyThird !== thirteenth && twentyThird !== fourteenth && twentyThird !== fifteenth && twentyThird !== sixteenth && twentyThird !== seventeenth && twentyThird !== eighteenth && twentyThird !== nineteenth && twentyThird !== twentieth && twentyThird !== twentyFirst && twentyThird !== twentySecond) {
            deduped.push(twentyThird);
        }
        if (twentyFourth !== first && twentyFourth !== second && twentyFourth !== third && twentyFourth !== fourth && twentyFourth !== fifth && twentyFourth !== sixth && twentyFourth !== seventh && twentyFourth !== eighth && twentyFourth !== ninth && twentyFourth !== tenth && twentyFourth !== eleventh && twentyFourth !== twelfth && twentyFourth !== thirteenth && twentyFourth !== fourteenth && twentyFourth !== fifteenth && twentyFourth !== sixteenth && twentyFourth !== seventeenth && twentyFourth !== eighteenth && twentyFourth !== nineteenth && twentyFourth !== twentieth && twentyFourth !== twentyFirst && twentyFourth !== twentySecond && twentyFourth !== twentyThird) {
            deduped.push(twentyFourth);
        }
        if (twentyFifth !== first && twentyFifth !== second && twentyFifth !== third && twentyFifth !== fourth && twentyFifth !== fifth && twentyFifth !== sixth && twentyFifth !== seventh && twentyFifth !== eighth && twentyFifth !== ninth && twentyFifth !== tenth && twentyFifth !== eleventh && twentyFifth !== twelfth && twentyFifth !== thirteenth && twentyFifth !== fourteenth && twentyFifth !== fifteenth && twentyFifth !== sixteenth && twentyFifth !== seventeenth && twentyFifth !== eighteenth && twentyFifth !== nineteenth && twentyFifth !== twentieth && twentyFifth !== twentyFirst && twentyFifth !== twentySecond && twentyFifth !== twentyThird && twentyFifth !== twentyFourth) {
            deduped.push(twentyFifth);
        }
        if (twentySixth !== first && twentySixth !== second && twentySixth !== third && twentySixth !== fourth && twentySixth !== fifth && twentySixth !== sixth && twentySixth !== seventh && twentySixth !== eighth && twentySixth !== ninth && twentySixth !== tenth && twentySixth !== eleventh && twentySixth !== twelfth && twentySixth !== thirteenth && twentySixth !== fourteenth && twentySixth !== fifteenth && twentySixth !== sixteenth && twentySixth !== seventeenth && twentySixth !== eighteenth && twentySixth !== nineteenth && twentySixth !== twentieth && twentySixth !== twentyFirst && twentySixth !== twentySecond && twentySixth !== twentyThird && twentySixth !== twentyFourth && twentySixth !== twentyFifth) {
            deduped.push(twentySixth);
        }
        if (twentySeventh !== first && twentySeventh !== second && twentySeventh !== third && twentySeventh !== fourth && twentySeventh !== fifth && twentySeventh !== sixth && twentySeventh !== seventh && twentySeventh !== eighth && twentySeventh !== ninth && twentySeventh !== tenth && twentySeventh !== eleventh && twentySeventh !== twelfth && twentySeventh !== thirteenth && twentySeventh !== fourteenth && twentySeventh !== fifteenth && twentySeventh !== sixteenth && twentySeventh !== seventeenth && twentySeventh !== eighteenth && twentySeventh !== nineteenth && twentySeventh !== twentieth && twentySeventh !== twentyFirst && twentySeventh !== twentySecond && twentySeventh !== twentyThird && twentySeventh !== twentyFourth && twentySeventh !== twentyFifth && twentySeventh !== twentySixth) {
            deduped.push(twentySeventh);
        }
        if (twentyEighth !== first && twentyEighth !== second && twentyEighth !== third && twentyEighth !== fourth && twentyEighth !== fifth && twentyEighth !== sixth && twentyEighth !== seventh && twentyEighth !== eighth && twentyEighth !== ninth && twentyEighth !== tenth && twentyEighth !== eleventh && twentyEighth !== twelfth && twentyEighth !== thirteenth && twentyEighth !== fourteenth && twentyEighth !== fifteenth && twentyEighth !== sixteenth && twentyEighth !== seventeenth && twentyEighth !== eighteenth && twentyEighth !== nineteenth && twentyEighth !== twentieth && twentyEighth !== twentyFirst && twentyEighth !== twentySecond && twentyEighth !== twentyThird && twentyEighth !== twentyFourth && twentyEighth !== twentyFifth && twentyEighth !== twentySixth && twentyEighth !== twentySeventh) {
            deduped.push(twentyEighth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 29) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const twentyThird = tokens[22];
        const twentyFourth = tokens[23];
        const twentyFifth = tokens[24];
        const twentySixth = tokens[25];
        const twentySeventh = tokens[26];
        const twentyEighth = tokens[27];
        const twentyNinth = tokens[28];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }
        if (twentyThird !== first && twentyThird !== second && twentyThird !== third && twentyThird !== fourth && twentyThird !== fifth && twentyThird !== sixth && twentyThird !== seventh && twentyThird !== eighth && twentyThird !== ninth && twentyThird !== tenth && twentyThird !== eleventh && twentyThird !== twelfth && twentyThird !== thirteenth && twentyThird !== fourteenth && twentyThird !== fifteenth && twentyThird !== sixteenth && twentyThird !== seventeenth && twentyThird !== eighteenth && twentyThird !== nineteenth && twentyThird !== twentieth && twentyThird !== twentyFirst && twentyThird !== twentySecond) {
            deduped.push(twentyThird);
        }
        if (twentyFourth !== first && twentyFourth !== second && twentyFourth !== third && twentyFourth !== fourth && twentyFourth !== fifth && twentyFourth !== sixth && twentyFourth !== seventh && twentyFourth !== eighth && twentyFourth !== ninth && twentyFourth !== tenth && twentyFourth !== eleventh && twentyFourth !== twelfth && twentyFourth !== thirteenth && twentyFourth !== fourteenth && twentyFourth !== fifteenth && twentyFourth !== sixteenth && twentyFourth !== seventeenth && twentyFourth !== eighteenth && twentyFourth !== nineteenth && twentyFourth !== twentieth && twentyFourth !== twentyFirst && twentyFourth !== twentySecond && twentyFourth !== twentyThird) {
            deduped.push(twentyFourth);
        }
        if (twentyFifth !== first && twentyFifth !== second && twentyFifth !== third && twentyFifth !== fourth && twentyFifth !== fifth && twentyFifth !== sixth && twentyFifth !== seventh && twentyFifth !== eighth && twentyFifth !== ninth && twentyFifth !== tenth && twentyFifth !== eleventh && twentyFifth !== twelfth && twentyFifth !== thirteenth && twentyFifth !== fourteenth && twentyFifth !== fifteenth && twentyFifth !== sixteenth && twentyFifth !== seventeenth && twentyFifth !== eighteenth && twentyFifth !== nineteenth && twentyFifth !== twentieth && twentyFifth !== twentyFirst && twentyFifth !== twentySecond && twentyFifth !== twentyThird && twentyFifth !== twentyFourth) {
            deduped.push(twentyFifth);
        }
        if (twentySixth !== first && twentySixth !== second && twentySixth !== third && twentySixth !== fourth && twentySixth !== fifth && twentySixth !== sixth && twentySixth !== seventh && twentySixth !== eighth && twentySixth !== ninth && twentySixth !== tenth && twentySixth !== eleventh && twentySixth !== twelfth && twentySixth !== thirteenth && twentySixth !== fourteenth && twentySixth !== fifteenth && twentySixth !== sixteenth && twentySixth !== seventeenth && twentySixth !== eighteenth && twentySixth !== nineteenth && twentySixth !== twentieth && twentySixth !== twentyFirst && twentySixth !== twentySecond && twentySixth !== twentyThird && twentySixth !== twentyFourth && twentySixth !== twentyFifth) {
            deduped.push(twentySixth);
        }
        if (twentySeventh !== first && twentySeventh !== second && twentySeventh !== third && twentySeventh !== fourth && twentySeventh !== fifth && twentySeventh !== sixth && twentySeventh !== seventh && twentySeventh !== eighth && twentySeventh !== ninth && twentySeventh !== tenth && twentySeventh !== eleventh && twentySeventh !== twelfth && twentySeventh !== thirteenth && twentySeventh !== fourteenth && twentySeventh !== fifteenth && twentySeventh !== sixteenth && twentySeventh !== seventeenth && twentySeventh !== eighteenth && twentySeventh !== nineteenth && twentySeventh !== twentieth && twentySeventh !== twentyFirst && twentySeventh !== twentySecond && twentySeventh !== twentyThird && twentySeventh !== twentyFourth && twentySeventh !== twentyFifth && twentySeventh !== twentySixth) {
            deduped.push(twentySeventh);
        }
        if (twentyEighth !== first && twentyEighth !== second && twentyEighth !== third && twentyEighth !== fourth && twentyEighth !== fifth && twentyEighth !== sixth && twentyEighth !== seventh && twentyEighth !== eighth && twentyEighth !== ninth && twentyEighth !== tenth && twentyEighth !== eleventh && twentyEighth !== twelfth && twentyEighth !== thirteenth && twentyEighth !== fourteenth && twentyEighth !== fifteenth && twentyEighth !== sixteenth && twentyEighth !== seventeenth && twentyEighth !== eighteenth && twentyEighth !== nineteenth && twentyEighth !== twentieth && twentyEighth !== twentyFirst && twentyEighth !== twentySecond && twentyEighth !== twentyThird && twentyEighth !== twentyFourth && twentyEighth !== twentyFifth && twentyEighth !== twentySixth && twentyEighth !== twentySeventh) {
            deduped.push(twentyEighth);
        }
        if (twentyNinth !== first && twentyNinth !== second && twentyNinth !== third && twentyNinth !== fourth && twentyNinth !== fifth && twentyNinth !== sixth && twentyNinth !== seventh && twentyNinth !== eighth && twentyNinth !== ninth && twentyNinth !== tenth && twentyNinth !== eleventh && twentyNinth !== twelfth && twentyNinth !== thirteenth && twentyNinth !== fourteenth && twentyNinth !== fifteenth && twentyNinth !== sixteenth && twentyNinth !== seventeenth && twentyNinth !== eighteenth && twentyNinth !== nineteenth && twentyNinth !== twentieth && twentyNinth !== twentyFirst && twentyNinth !== twentySecond && twentyNinth !== twentyThird && twentyNinth !== twentyFourth && twentyNinth !== twentyFifth && twentyNinth !== twentySixth && twentyNinth !== twentySeventh && twentyNinth !== twentyEighth) {
            deduped.push(twentyNinth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }
    if (tokens.length === 30) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const twentyThird = tokens[22];
        const twentyFourth = tokens[23];
        const twentyFifth = tokens[24];
        const twentySixth = tokens[25];
        const twentySeventh = tokens[26];
        const twentyEighth = tokens[27];
        const twentyNinth = tokens[28];
        const thirtieth = tokens[29];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }
        if (twentyThird !== first && twentyThird !== second && twentyThird !== third && twentyThird !== fourth && twentyThird !== fifth && twentyThird !== sixth && twentyThird !== seventh && twentyThird !== eighth && twentyThird !== ninth && twentyThird !== tenth && twentyThird !== eleventh && twentyThird !== twelfth && twentyThird !== thirteenth && twentyThird !== fourteenth && twentyThird !== fifteenth && twentyThird !== sixteenth && twentyThird !== seventeenth && twentyThird !== eighteenth && twentyThird !== nineteenth && twentyThird !== twentieth && twentyThird !== twentyFirst && twentyThird !== twentySecond) {
            deduped.push(twentyThird);
        }
        if (twentyFourth !== first && twentyFourth !== second && twentyFourth !== third && twentyFourth !== fourth && twentyFourth !== fifth && twentyFourth !== sixth && twentyFourth !== seventh && twentyFourth !== eighth && twentyFourth !== ninth && twentyFourth !== tenth && twentyFourth !== eleventh && twentyFourth !== twelfth && twentyFourth !== thirteenth && twentyFourth !== fourteenth && twentyFourth !== fifteenth && twentyFourth !== sixteenth && twentyFourth !== seventeenth && twentyFourth !== eighteenth && twentyFourth !== nineteenth && twentyFourth !== twentieth && twentyFourth !== twentyFirst && twentyFourth !== twentySecond && twentyFourth !== twentyThird) {
            deduped.push(twentyFourth);
        }
        if (twentyFifth !== first && twentyFifth !== second && twentyFifth !== third && twentyFifth !== fourth && twentyFifth !== fifth && twentyFifth !== sixth && twentyFifth !== seventh && twentyFifth !== eighth && twentyFifth !== ninth && twentyFifth !== tenth && twentyFifth !== eleventh && twentyFifth !== twelfth && twentyFifth !== thirteenth && twentyFifth !== fourteenth && twentyFifth !== fifteenth && twentyFifth !== sixteenth && twentyFifth !== seventeenth && twentyFifth !== eighteenth && twentyFifth !== nineteenth && twentyFifth !== twentieth && twentyFifth !== twentyFirst && twentyFifth !== twentySecond && twentyFifth !== twentyThird && twentyFifth !== twentyFourth) {
            deduped.push(twentyFifth);
        }
        if (twentySixth !== first && twentySixth !== second && twentySixth !== third && twentySixth !== fourth && twentySixth !== fifth && twentySixth !== sixth && twentySixth !== seventh && twentySixth !== eighth && twentySixth !== ninth && twentySixth !== tenth && twentySixth !== eleventh && twentySixth !== twelfth && twentySixth !== thirteenth && twentySixth !== fourteenth && twentySixth !== fifteenth && twentySixth !== sixteenth && twentySixth !== seventeenth && twentySixth !== eighteenth && twentySixth !== nineteenth && twentySixth !== twentieth && twentySixth !== twentyFirst && twentySixth !== twentySecond && twentySixth !== twentyThird && twentySixth !== twentyFourth && twentySixth !== twentyFifth) {
            deduped.push(twentySixth);
        }
        if (twentySeventh !== first && twentySeventh !== second && twentySeventh !== third && twentySeventh !== fourth && twentySeventh !== fifth && twentySeventh !== sixth && twentySeventh !== seventh && twentySeventh !== eighth && twentySeventh !== ninth && twentySeventh !== tenth && twentySeventh !== eleventh && twentySeventh !== twelfth && twentySeventh !== thirteenth && twentySeventh !== fourteenth && twentySeventh !== fifteenth && twentySeventh !== sixteenth && twentySeventh !== seventeenth && twentySeventh !== eighteenth && twentySeventh !== nineteenth && twentySeventh !== twentieth && twentySeventh !== twentyFirst && twentySeventh !== twentySecond && twentySeventh !== twentyThird && twentySeventh !== twentyFourth && twentySeventh !== twentyFifth && twentySeventh !== twentySixth) {
            deduped.push(twentySeventh);
        }
        if (twentyEighth !== first && twentyEighth !== second && twentyEighth !== third && twentyEighth !== fourth && twentyEighth !== fifth && twentyEighth !== sixth && twentyEighth !== seventh && twentyEighth !== eighth && twentyEighth !== ninth && twentyEighth !== tenth && twentyEighth !== eleventh && twentyEighth !== twelfth && twentyEighth !== thirteenth && twentyEighth !== fourteenth && twentyEighth !== fifteenth && twentyEighth !== sixteenth && twentyEighth !== seventeenth && twentyEighth !== eighteenth && twentyEighth !== nineteenth && twentyEighth !== twentieth && twentyEighth !== twentyFirst && twentyEighth !== twentySecond && twentyEighth !== twentyThird && twentyEighth !== twentyFourth && twentyEighth !== twentyFifth && twentyEighth !== twentySixth && twentyEighth !== twentySeventh) {
            deduped.push(twentyEighth);
        }
        if (twentyNinth !== first && twentyNinth !== second && twentyNinth !== third && twentyNinth !== fourth && twentyNinth !== fifth && twentyNinth !== sixth && twentyNinth !== seventh && twentyNinth !== eighth && twentyNinth !== ninth && twentyNinth !== tenth && twentyNinth !== eleventh && twentyNinth !== twelfth && twentyNinth !== thirteenth && twentyNinth !== fourteenth && twentyNinth !== fifteenth && twentyNinth !== sixteenth && twentyNinth !== seventeenth && twentyNinth !== eighteenth && twentyNinth !== nineteenth && twentyNinth !== twentieth && twentyNinth !== twentyFirst && twentyNinth !== twentySecond && twentyNinth !== twentyThird && twentyNinth !== twentyFourth && twentyNinth !== twentyFifth && twentyNinth !== twentySixth && twentyNinth !== twentySeventh && twentyNinth !== twentyEighth) {
            deduped.push(twentyNinth);
        }
        if (thirtieth !== first && thirtieth !== second && thirtieth !== third && thirtieth !== fourth && thirtieth !== fifth && thirtieth !== sixth && thirtieth !== seventh && thirtieth !== eighth && thirtieth !== ninth && thirtieth !== tenth && thirtieth !== eleventh && thirtieth !== twelfth && thirtieth !== thirteenth && thirtieth !== fourteenth && thirtieth !== fifteenth && thirtieth !== sixteenth && thirtieth !== seventeenth && thirtieth !== eighteenth && thirtieth !== nineteenth && thirtieth !== twentieth && thirtieth !== twentyFirst && thirtieth !== twentySecond && thirtieth !== twentyThird && thirtieth !== twentyFourth && thirtieth !== twentyFifth && thirtieth !== twentySixth && thirtieth !== twentySeventh && thirtieth !== twentyEighth && thirtieth !== twentyNinth) {
            deduped.push(thirtieth);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }

    if (tokens.length === 31) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const twentyThird = tokens[22];
        const twentyFourth = tokens[23];
        const twentyFifth = tokens[24];
        const twentySixth = tokens[25];
        const twentySeventh = tokens[26];
        const twentyEighth = tokens[27];
        const twentyNinth = tokens[28];
        const thirtieth = tokens[29];
        const thirtyFirst = tokens[30];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }
        if (twentyThird !== first && twentyThird !== second && twentyThird !== third && twentyThird !== fourth && twentyThird !== fifth && twentyThird !== sixth && twentyThird !== seventh && twentyThird !== eighth && twentyThird !== ninth && twentyThird !== tenth && twentyThird !== eleventh && twentyThird !== twelfth && twentyThird !== thirteenth && twentyThird !== fourteenth && twentyThird !== fifteenth && twentyThird !== sixteenth && twentyThird !== seventeenth && twentyThird !== eighteenth && twentyThird !== nineteenth && twentyThird !== twentieth && twentyThird !== twentyFirst && twentyThird !== twentySecond) {
            deduped.push(twentyThird);
        }
        if (twentyFourth !== first && twentyFourth !== second && twentyFourth !== third && twentyFourth !== fourth && twentyFourth !== fifth && twentyFourth !== sixth && twentyFourth !== seventh && twentyFourth !== eighth && twentyFourth !== ninth && twentyFourth !== tenth && twentyFourth !== eleventh && twentyFourth !== twelfth && twentyFourth !== thirteenth && twentyFourth !== fourteenth && twentyFourth !== fifteenth && twentyFourth !== sixteenth && twentyFourth !== seventeenth && twentyFourth !== eighteenth && twentyFourth !== nineteenth && twentyFourth !== twentieth && twentyFourth !== twentyFirst && twentyFourth !== twentySecond && twentyFourth !== twentyThird) {
            deduped.push(twentyFourth);
        }
        if (twentyFifth !== first && twentyFifth !== second && twentyFifth !== third && twentyFifth !== fourth && twentyFifth !== fifth && twentyFifth !== sixth && twentyFifth !== seventh && twentyFifth !== eighth && twentyFifth !== ninth && twentyFifth !== tenth && twentyFifth !== eleventh && twentyFifth !== twelfth && twentyFifth !== thirteenth && twentyFifth !== fourteenth && twentyFifth !== fifteenth && twentyFifth !== sixteenth && twentyFifth !== seventeenth && twentyFifth !== eighteenth && twentyFifth !== nineteenth && twentyFifth !== twentieth && twentyFifth !== twentyFirst && twentyFifth !== twentySecond && twentyFifth !== twentyThird && twentyFifth !== twentyFourth) {
            deduped.push(twentyFifth);
        }
        if (twentySixth !== first && twentySixth !== second && twentySixth !== third && twentySixth !== fourth && twentySixth !== fifth && twentySixth !== sixth && twentySixth !== seventh && twentySixth !== eighth && twentySixth !== ninth && twentySixth !== tenth && twentySixth !== eleventh && twentySixth !== twelfth && twentySixth !== thirteenth && twentySixth !== fourteenth && twentySixth !== fifteenth && twentySixth !== sixteenth && twentySixth !== seventeenth && twentySixth !== eighteenth && twentySixth !== nineteenth && twentySixth !== twentieth && twentySixth !== twentyFirst && twentySixth !== twentySecond && twentySixth !== twentyThird && twentySixth !== twentyFourth && twentySixth !== twentyFifth) {
            deduped.push(twentySixth);
        }
        if (twentySeventh !== first && twentySeventh !== second && twentySeventh !== third && twentySeventh !== fourth && twentySeventh !== fifth && twentySeventh !== sixth && twentySeventh !== seventh && twentySeventh !== eighth && twentySeventh !== ninth && twentySeventh !== tenth && twentySeventh !== eleventh && twentySeventh !== twelfth && twentySeventh !== thirteenth && twentySeventh !== fourteenth && twentySeventh !== fifteenth && twentySeventh !== sixteenth && twentySeventh !== seventeenth && twentySeventh !== eighteenth && twentySeventh !== nineteenth && twentySeventh !== twentieth && twentySeventh !== twentyFirst && twentySeventh !== twentySecond && twentySeventh !== twentyThird && twentySeventh !== twentyFourth && twentySeventh !== twentyFifth && twentySeventh !== twentySixth) {
            deduped.push(twentySeventh);
        }
        if (twentyEighth !== first && twentyEighth !== second && twentyEighth !== third && twentyEighth !== fourth && twentyEighth !== fifth && twentyEighth !== sixth && twentyEighth !== seventh && twentyEighth !== eighth && twentyEighth !== ninth && twentyEighth !== tenth && twentyEighth !== eleventh && twentyEighth !== twelfth && twentyEighth !== thirteenth && twentyEighth !== fourteenth && twentyEighth !== fifteenth && twentyEighth !== sixteenth && twentyEighth !== seventeenth && twentyEighth !== eighteenth && twentyEighth !== nineteenth && twentyEighth !== twentieth && twentyEighth !== twentyFirst && twentyEighth !== twentySecond && twentyEighth !== twentyThird && twentyEighth !== twentyFourth && twentyEighth !== twentyFifth && twentyEighth !== twentySixth && twentyEighth !== twentySeventh) {
            deduped.push(twentyEighth);
        }
        if (twentyNinth !== first && twentyNinth !== second && twentyNinth !== third && twentyNinth !== fourth && twentyNinth !== fifth && twentyNinth !== sixth && twentyNinth !== seventh && twentyNinth !== eighth && twentyNinth !== ninth && twentyNinth !== tenth && twentyNinth !== eleventh && twentyNinth !== twelfth && twentyNinth !== thirteenth && twentyNinth !== fourteenth && twentyNinth !== fifteenth && twentyNinth !== sixteenth && twentyNinth !== seventeenth && twentyNinth !== eighteenth && twentyNinth !== nineteenth && twentyNinth !== twentieth && twentyNinth !== twentyFirst && twentyNinth !== twentySecond && twentyNinth !== twentyThird && twentyNinth !== twentyFourth && twentyNinth !== twentyFifth && twentyNinth !== twentySixth && twentyNinth !== twentySeventh && twentyNinth !== twentyEighth) {
            deduped.push(twentyNinth);
        }
        if (thirtieth !== first && thirtieth !== second && thirtieth !== third && thirtieth !== fourth && thirtieth !== fifth && thirtieth !== sixth && thirtieth !== seventh && thirtieth !== eighth && thirtieth !== ninth && thirtieth !== tenth && thirtieth !== eleventh && thirtieth !== twelfth && thirtieth !== thirteenth && thirtieth !== fourteenth && thirtieth !== fifteenth && thirtieth !== sixteenth && thirtieth !== seventeenth && thirtieth !== eighteenth && thirtieth !== nineteenth && thirtieth !== twentieth && thirtieth !== twentyFirst && thirtieth !== twentySecond && thirtieth !== twentyThird && thirtieth !== twentyFourth && thirtieth !== twentyFifth && thirtieth !== twentySixth && thirtieth !== twentySeventh && thirtieth !== twentyEighth && thirtieth !== twentyNinth) {
            deduped.push(thirtieth);
        }
        if (thirtyFirst !== first && thirtyFirst !== second && thirtyFirst !== third && thirtyFirst !== fourth && thirtyFirst !== fifth && thirtyFirst !== sixth && thirtyFirst !== seventh && thirtyFirst !== eighth && thirtyFirst !== ninth && thirtyFirst !== tenth && thirtyFirst !== eleventh && thirtyFirst !== twelfth && thirtyFirst !== thirteenth && thirtyFirst !== fourteenth && thirtyFirst !== fifteenth && thirtyFirst !== sixteenth && thirtyFirst !== seventeenth && thirtyFirst !== eighteenth && thirtyFirst !== nineteenth && thirtyFirst !== twentieth && thirtyFirst !== twentyFirst && thirtyFirst !== twentySecond && thirtyFirst !== twentyThird && thirtyFirst !== twentyFourth && thirtyFirst !== twentyFifth && thirtyFirst !== twentySixth && thirtyFirst !== twentySeventh && thirtyFirst !== twentyEighth && thirtyFirst !== twentyNinth && thirtyFirst !== thirtieth) {
            deduped.push(thirtyFirst);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }

    if (tokens.length === 32) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const twentyThird = tokens[22];
        const twentyFourth = tokens[23];
        const twentyFifth = tokens[24];
        const twentySixth = tokens[25];
        const twentySeventh = tokens[26];
        const twentyEighth = tokens[27];
        const twentyNinth = tokens[28];
        const thirtieth = tokens[29];
        const thirtyFirst = tokens[30];
        const thirtySecond = tokens[31];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }
        if (twentyThird !== first && twentyThird !== second && twentyThird !== third && twentyThird !== fourth && twentyThird !== fifth && twentyThird !== sixth && twentyThird !== seventh && twentyThird !== eighth && twentyThird !== ninth && twentyThird !== tenth && twentyThird !== eleventh && twentyThird !== twelfth && twentyThird !== thirteenth && twentyThird !== fourteenth && twentyThird !== fifteenth && twentyThird !== sixteenth && twentyThird !== seventeenth && twentyThird !== eighteenth && twentyThird !== nineteenth && twentyThird !== twentieth && twentyThird !== twentyFirst && twentyThird !== twentySecond) {
            deduped.push(twentyThird);
        }
        if (twentyFourth !== first && twentyFourth !== second && twentyFourth !== third && twentyFourth !== fourth && twentyFourth !== fifth && twentyFourth !== sixth && twentyFourth !== seventh && twentyFourth !== eighth && twentyFourth !== ninth && twentyFourth !== tenth && twentyFourth !== eleventh && twentyFourth !== twelfth && twentyFourth !== thirteenth && twentyFourth !== fourteenth && twentyFourth !== fifteenth && twentyFourth !== sixteenth && twentyFourth !== seventeenth && twentyFourth !== eighteenth && twentyFourth !== nineteenth && twentyFourth !== twentieth && twentyFourth !== twentyFirst && twentyFourth !== twentySecond && twentyFourth !== twentyThird) {
            deduped.push(twentyFourth);
        }
        if (twentyFifth !== first && twentyFifth !== second && twentyFifth !== third && twentyFifth !== fourth && twentyFifth !== fifth && twentyFifth !== sixth && twentyFifth !== seventh && twentyFifth !== eighth && twentyFifth !== ninth && twentyFifth !== tenth && twentyFifth !== eleventh && twentyFifth !== twelfth && twentyFifth !== thirteenth && twentyFifth !== fourteenth && twentyFifth !== fifteenth && twentyFifth !== sixteenth && twentyFifth !== seventeenth && twentyFifth !== eighteenth && twentyFifth !== nineteenth && twentyFifth !== twentieth && twentyFifth !== twentyFirst && twentyFifth !== twentySecond && twentyFifth !== twentyThird && twentyFifth !== twentyFourth) {
            deduped.push(twentyFifth);
        }
        if (twentySixth !== first && twentySixth !== second && twentySixth !== third && twentySixth !== fourth && twentySixth !== fifth && twentySixth !== sixth && twentySixth !== seventh && twentySixth !== eighth && twentySixth !== ninth && twentySixth !== tenth && twentySixth !== eleventh && twentySixth !== twelfth && twentySixth !== thirteenth && twentySixth !== fourteenth && twentySixth !== fifteenth && twentySixth !== sixteenth && twentySixth !== seventeenth && twentySixth !== eighteenth && twentySixth !== nineteenth && twentySixth !== twentieth && twentySixth !== twentyFirst && twentySixth !== twentySecond && twentySixth !== twentyThird && twentySixth !== twentyFourth && twentySixth !== twentyFifth) {
            deduped.push(twentySixth);
        }
        if (twentySeventh !== first && twentySeventh !== second && twentySeventh !== third && twentySeventh !== fourth && twentySeventh !== fifth && twentySeventh !== sixth && twentySeventh !== seventh && twentySeventh !== eighth && twentySeventh !== ninth && twentySeventh !== tenth && twentySeventh !== eleventh && twentySeventh !== twelfth && twentySeventh !== thirteenth && twentySeventh !== fourteenth && twentySeventh !== fifteenth && twentySeventh !== sixteenth && twentySeventh !== seventeenth && twentySeventh !== eighteenth && twentySeventh !== nineteenth && twentySeventh !== twentieth && twentySeventh !== twentyFirst && twentySeventh !== twentySecond && twentySeventh !== twentyThird && twentySeventh !== twentyFourth && twentySeventh !== twentyFifth && twentySeventh !== twentySixth) {
            deduped.push(twentySeventh);
        }
        if (twentyEighth !== first && twentyEighth !== second && twentyEighth !== third && twentyEighth !== fourth && twentyEighth !== fifth && twentyEighth !== sixth && twentyEighth !== seventh && twentyEighth !== eighth && twentyEighth !== ninth && twentyEighth !== tenth && twentyEighth !== eleventh && twentyEighth !== twelfth && twentyEighth !== thirteenth && twentyEighth !== fourteenth && twentyEighth !== fifteenth && twentyEighth !== sixteenth && twentyEighth !== seventeenth && twentyEighth !== eighteenth && twentyEighth !== nineteenth && twentyEighth !== twentieth && twentyEighth !== twentyFirst && twentyEighth !== twentySecond && twentyEighth !== twentyThird && twentyEighth !== twentyFourth && twentyEighth !== twentyFifth && twentyEighth !== twentySixth && twentyEighth !== twentySeventh) {
            deduped.push(twentyEighth);
        }
        if (twentyNinth !== first && twentyNinth !== second && twentyNinth !== third && twentyNinth !== fourth && twentyNinth !== fifth && twentyNinth !== sixth && twentyNinth !== seventh && twentyNinth !== eighth && twentyNinth !== ninth && twentyNinth !== tenth && twentyNinth !== eleventh && twentyNinth !== twelfth && twentyNinth !== thirteenth && twentyNinth !== fourteenth && twentyNinth !== fifteenth && twentyNinth !== sixteenth && twentyNinth !== seventeenth && twentyNinth !== eighteenth && twentyNinth !== nineteenth && twentyNinth !== twentieth && twentyNinth !== twentyFirst && twentyNinth !== twentySecond && twentyNinth !== twentyThird && twentyNinth !== twentyFourth && twentyNinth !== twentyFifth && twentyNinth !== twentySixth && twentyNinth !== twentySeventh && twentyNinth !== twentyEighth) {
            deduped.push(twentyNinth);
        }
        if (thirtieth !== first && thirtieth !== second && thirtieth !== third && thirtieth !== fourth && thirtieth !== fifth && thirtieth !== sixth && thirtieth !== seventh && thirtieth !== eighth && thirtieth !== ninth && thirtieth !== tenth && thirtieth !== eleventh && thirtieth !== twelfth && thirtieth !== thirteenth && thirtieth !== fourteenth && thirtieth !== fifteenth && thirtieth !== sixteenth && thirtieth !== seventeenth && thirtieth !== eighteenth && thirtieth !== nineteenth && thirtieth !== twentieth && thirtieth !== twentyFirst && thirtieth !== twentySecond && thirtieth !== twentyThird && thirtieth !== twentyFourth && thirtieth !== twentyFifth && thirtieth !== twentySixth && thirtieth !== twentySeventh && thirtieth !== twentyEighth && thirtieth !== twentyNinth) {
            deduped.push(thirtieth);
        }
        if (thirtyFirst !== first && thirtyFirst !== second && thirtyFirst !== third && thirtyFirst !== fourth && thirtyFirst !== fifth && thirtyFirst !== sixth && thirtyFirst !== seventh && thirtyFirst !== eighth && thirtyFirst !== ninth && thirtyFirst !== tenth && thirtyFirst !== eleventh && thirtyFirst !== twelfth && thirtyFirst !== thirteenth && thirtyFirst !== fourteenth && thirtyFirst !== fifteenth && thirtyFirst !== sixteenth && thirtyFirst !== seventeenth && thirtyFirst !== eighteenth && thirtyFirst !== nineteenth && thirtyFirst !== twentieth && thirtyFirst !== twentyFirst && thirtyFirst !== twentySecond && thirtyFirst !== twentyThird && thirtyFirst !== twentyFourth && thirtyFirst !== twentyFifth && thirtyFirst !== twentySixth && thirtyFirst !== twentySeventh && thirtyFirst !== twentyEighth && thirtyFirst !== twentyNinth && thirtyFirst !== thirtieth) {
            deduped.push(thirtyFirst);
        }
        if (thirtySecond !== first && thirtySecond !== second && thirtySecond !== third && thirtySecond !== fourth && thirtySecond !== fifth && thirtySecond !== sixth && thirtySecond !== seventh && thirtySecond !== eighth && thirtySecond !== ninth && thirtySecond !== tenth && thirtySecond !== eleventh && thirtySecond !== twelfth && thirtySecond !== thirteenth && thirtySecond !== fourteenth && thirtySecond !== fifteenth && thirtySecond !== sixteenth && thirtySecond !== seventeenth && thirtySecond !== eighteenth && thirtySecond !== nineteenth && thirtySecond !== twentieth && thirtySecond !== twentyFirst && thirtySecond !== twentySecond && thirtySecond !== twentyThird && thirtySecond !== twentyFourth && thirtySecond !== twentyFifth && thirtySecond !== twentySixth && thirtySecond !== twentySeventh && thirtySecond !== twentyEighth && thirtySecond !== twentyNinth && thirtySecond !== thirtieth && thirtySecond !== thirtyFirst) {
            deduped.push(thirtySecond);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }

    if (tokens.length === 33) {
        const first = tokens[0];
        const second = tokens[1];
        const third = tokens[2];
        const fourth = tokens[3];
        const fifth = tokens[4];
        const sixth = tokens[5];
        const seventh = tokens[6];
        const eighth = tokens[7];
        const ninth = tokens[8];
        const tenth = tokens[9];
        const eleventh = tokens[10];
        const twelfth = tokens[11];
        const thirteenth = tokens[12];
        const fourteenth = tokens[13];
        const fifteenth = tokens[14];
        const sixteenth = tokens[15];
        const seventeenth = tokens[16];
        const eighteenth = tokens[17];
        const nineteenth = tokens[18];
        const twentieth = tokens[19];
        const twentyFirst = tokens[20];
        const twentySecond = tokens[21];
        const twentyThird = tokens[22];
        const twentyFourth = tokens[23];
        const twentyFifth = tokens[24];
        const twentySixth = tokens[25];
        const twentySeventh = tokens[26];
        const twentyEighth = tokens[27];
        const twentyNinth = tokens[28];
        const thirtieth = tokens[29];
        const thirtyFirst = tokens[30];
        const thirtySecond = tokens[31];
        const thirtyThird = tokens[32];
        const deduped: string[] = [first];

        if (second !== first) {
            deduped.push(second);
        }
        if (third !== first && third !== second) {
            deduped.push(third);
        }
        if (fourth !== first && fourth !== second && fourth !== third) {
            deduped.push(fourth);
        }
        if (fifth !== first && fifth !== second && fifth !== third && fifth !== fourth) {
            deduped.push(fifth);
        }
        if (sixth !== first && sixth !== second && sixth !== third && sixth !== fourth && sixth !== fifth) {
            deduped.push(sixth);
        }
        if (seventh !== first && seventh !== second && seventh !== third && seventh !== fourth && seventh !== fifth && seventh !== sixth) {
            deduped.push(seventh);
        }
        if (eighth !== first && eighth !== second && eighth !== third && eighth !== fourth && eighth !== fifth && eighth !== sixth && eighth !== seventh) {
            deduped.push(eighth);
        }
        if (ninth !== first && ninth !== second && ninth !== third && ninth !== fourth && ninth !== fifth && ninth !== sixth && ninth !== seventh && ninth !== eighth) {
            deduped.push(ninth);
        }
        if (tenth !== first && tenth !== second && tenth !== third && tenth !== fourth && tenth !== fifth && tenth !== sixth && tenth !== seventh && tenth !== eighth && tenth !== ninth) {
            deduped.push(tenth);
        }
        if (eleventh !== first && eleventh !== second && eleventh !== third && eleventh !== fourth && eleventh !== fifth && eleventh !== sixth && eleventh !== seventh && eleventh !== eighth && eleventh !== ninth && eleventh !== tenth) {
            deduped.push(eleventh);
        }
        if (twelfth !== first && twelfth !== second && twelfth !== third && twelfth !== fourth && twelfth !== fifth && twelfth !== sixth && twelfth !== seventh && twelfth !== eighth && twelfth !== ninth && twelfth !== tenth && twelfth !== eleventh) {
            deduped.push(twelfth);
        }
        if (thirteenth !== first && thirteenth !== second && thirteenth !== third && thirteenth !== fourth && thirteenth !== fifth && thirteenth !== sixth && thirteenth !== seventh && thirteenth !== eighth && thirteenth !== ninth && thirteenth !== tenth && thirteenth !== eleventh && thirteenth !== twelfth) {
            deduped.push(thirteenth);
        }
        if (fourteenth !== first && fourteenth !== second && fourteenth !== third && fourteenth !== fourth && fourteenth !== fifth && fourteenth !== sixth && fourteenth !== seventh && fourteenth !== eighth && fourteenth !== ninth && fourteenth !== tenth && fourteenth !== eleventh && fourteenth !== twelfth && fourteenth !== thirteenth) {
            deduped.push(fourteenth);
        }
        if (fifteenth !== first && fifteenth !== second && fifteenth !== third && fifteenth !== fourth && fifteenth !== fifth && fifteenth !== sixth && fifteenth !== seventh && fifteenth !== eighth && fifteenth !== ninth && fifteenth !== tenth && fifteenth !== eleventh && fifteenth !== twelfth && fifteenth !== thirteenth && fifteenth !== fourteenth) {
            deduped.push(fifteenth);
        }
        if (sixteenth !== first && sixteenth !== second && sixteenth !== third && sixteenth !== fourth && sixteenth !== fifth && sixteenth !== sixth && sixteenth !== seventh && sixteenth !== eighth && sixteenth !== ninth && sixteenth !== tenth && sixteenth !== eleventh && sixteenth !== twelfth && sixteenth !== thirteenth && sixteenth !== fourteenth && sixteenth !== fifteenth) {
            deduped.push(sixteenth);
        }
        if (seventeenth !== first && seventeenth !== second && seventeenth !== third && seventeenth !== fourth && seventeenth !== fifth && seventeenth !== sixth && seventeenth !== seventh && seventeenth !== eighth && seventeenth !== ninth && seventeenth !== tenth && seventeenth !== eleventh && seventeenth !== twelfth && seventeenth !== thirteenth && seventeenth !== fourteenth && seventeenth !== fifteenth && seventeenth !== sixteenth) {
            deduped.push(seventeenth);
        }
        if (eighteenth !== first && eighteenth !== second && eighteenth !== third && eighteenth !== fourth && eighteenth !== fifth && eighteenth !== sixth && eighteenth !== seventh && eighteenth !== eighth && eighteenth !== ninth && eighteenth !== tenth && eighteenth !== eleventh && eighteenth !== twelfth && eighteenth !== thirteenth && eighteenth !== fourteenth && eighteenth !== fifteenth && eighteenth !== sixteenth && eighteenth !== seventeenth) {
            deduped.push(eighteenth);
        }
        if (nineteenth !== first && nineteenth !== second && nineteenth !== third && nineteenth !== fourth && nineteenth !== fifth && nineteenth !== sixth && nineteenth !== seventh && nineteenth !== eighth && nineteenth !== ninth && nineteenth !== tenth && nineteenth !== eleventh && nineteenth !== twelfth && nineteenth !== thirteenth && nineteenth !== fourteenth && nineteenth !== fifteenth && nineteenth !== sixteenth && nineteenth !== seventeenth && nineteenth !== eighteenth) {
            deduped.push(nineteenth);
        }
        if (twentieth !== first && twentieth !== second && twentieth !== third && twentieth !== fourth && twentieth !== fifth && twentieth !== sixth && twentieth !== seventh && twentieth !== eighth && twentieth !== ninth && twentieth !== tenth && twentieth !== eleventh && twentieth !== twelfth && twentieth !== thirteenth && twentieth !== fourteenth && twentieth !== fifteenth && twentieth !== sixteenth && twentieth !== seventeenth && twentieth !== eighteenth && twentieth !== nineteenth) {
            deduped.push(twentieth);
        }
        if (twentyFirst !== first && twentyFirst !== second && twentyFirst !== third && twentyFirst !== fourth && twentyFirst !== fifth && twentyFirst !== sixth && twentyFirst !== seventh && twentyFirst !== eighth && twentyFirst !== ninth && twentyFirst !== tenth && twentyFirst !== eleventh && twentyFirst !== twelfth && twentyFirst !== thirteenth && twentyFirst !== fourteenth && twentyFirst !== fifteenth && twentyFirst !== sixteenth && twentyFirst !== seventeenth && twentyFirst !== eighteenth && twentyFirst !== nineteenth && twentyFirst !== twentieth) {
            deduped.push(twentyFirst);
        }
        if (twentySecond !== first && twentySecond !== second && twentySecond !== third && twentySecond !== fourth && twentySecond !== fifth && twentySecond !== sixth && twentySecond !== seventh && twentySecond !== eighth && twentySecond !== ninth && twentySecond !== tenth && twentySecond !== eleventh && twentySecond !== twelfth && twentySecond !== thirteenth && twentySecond !== fourteenth && twentySecond !== fifteenth && twentySecond !== sixteenth && twentySecond !== seventeenth && twentySecond !== eighteenth && twentySecond !== nineteenth && twentySecond !== twentieth && twentySecond !== twentyFirst) {
            deduped.push(twentySecond);
        }
        if (twentyThird !== first && twentyThird !== second && twentyThird !== third && twentyThird !== fourth && twentyThird !== fifth && twentyThird !== sixth && twentyThird !== seventh && twentyThird !== eighth && twentyThird !== ninth && twentyThird !== tenth && twentyThird !== eleventh && twentyThird !== twelfth && twentyThird !== thirteenth && twentyThird !== fourteenth && twentyThird !== fifteenth && twentyThird !== sixteenth && twentyThird !== seventeenth && twentyThird !== eighteenth && twentyThird !== nineteenth && twentyThird !== twentieth && twentyThird !== twentyFirst && twentyThird !== twentySecond) {
            deduped.push(twentyThird);
        }
        if (twentyFourth !== first && twentyFourth !== second && twentyFourth !== third && twentyFourth !== fourth && twentyFourth !== fifth && twentyFourth !== sixth && twentyFourth !== seventh && twentyFourth !== eighth && twentyFourth !== ninth && twentyFourth !== tenth && twentyFourth !== eleventh && twentyFourth !== twelfth && twentyFourth !== thirteenth && twentyFourth !== fourteenth && twentyFourth !== fifteenth && twentyFourth !== sixteenth && twentyFourth !== seventeenth && twentyFourth !== eighteenth && twentyFourth !== nineteenth && twentyFourth !== twentieth && twentyFourth !== twentyFirst && twentyFourth !== twentySecond && twentyFourth !== twentyThird) {
            deduped.push(twentyFourth);
        }
        if (twentyFifth !== first && twentyFifth !== second && twentyFifth !== third && twentyFifth !== fourth && twentyFifth !== fifth && twentyFifth !== sixth && twentyFifth !== seventh && twentyFifth !== eighth && twentyFifth !== ninth && twentyFifth !== tenth && twentyFifth !== eleventh && twentyFifth !== twelfth && twentyFifth !== thirteenth && twentyFifth !== fourteenth && twentyFifth !== fifteenth && twentyFifth !== sixteenth && twentyFifth !== seventeenth && twentyFifth !== eighteenth && twentyFifth !== nineteenth && twentyFifth !== twentieth && twentyFifth !== twentyFirst && twentyFifth !== twentySecond && twentyFifth !== twentyThird && twentyFifth !== twentyFourth) {
            deduped.push(twentyFifth);
        }
        if (twentySixth !== first && twentySixth !== second && twentySixth !== third && twentySixth !== fourth && twentySixth !== fifth && twentySixth !== sixth && twentySixth !== seventh && twentySixth !== eighth && twentySixth !== ninth && twentySixth !== tenth && twentySixth !== eleventh && twentySixth !== twelfth && twentySixth !== thirteenth && twentySixth !== fourteenth && twentySixth !== fifteenth && twentySixth !== sixteenth && twentySixth !== seventeenth && twentySixth !== eighteenth && twentySixth !== nineteenth && twentySixth !== twentieth && twentySixth !== twentyFirst && twentySixth !== twentySecond && twentySixth !== twentyThird && twentySixth !== twentyFourth && twentySixth !== twentyFifth) {
            deduped.push(twentySixth);
        }
        if (twentySeventh !== first && twentySeventh !== second && twentySeventh !== third && twentySeventh !== fourth && twentySeventh !== fifth && twentySeventh !== sixth && twentySeventh !== seventh && twentySeventh !== eighth && twentySeventh !== ninth && twentySeventh !== tenth && twentySeventh !== eleventh && twentySeventh !== twelfth && twentySeventh !== thirteenth && twentySeventh !== fourteenth && twentySeventh !== fifteenth && twentySeventh !== sixteenth && twentySeventh !== seventeenth && twentySeventh !== eighteenth && twentySeventh !== nineteenth && twentySeventh !== twentieth && twentySeventh !== twentyFirst && twentySeventh !== twentySecond && twentySeventh !== twentyThird && twentySeventh !== twentyFourth && twentySeventh !== twentyFifth && twentySeventh !== twentySixth) {
            deduped.push(twentySeventh);
        }
        if (twentyEighth !== first && twentyEighth !== second && twentyEighth !== third && twentyEighth !== fourth && twentyEighth !== fifth && twentyEighth !== sixth && twentyEighth !== seventh && twentyEighth !== eighth && twentyEighth !== ninth && twentyEighth !== tenth && twentyEighth !== eleventh && twentyEighth !== twelfth && twentyEighth !== thirteenth && twentyEighth !== fourteenth && twentyEighth !== fifteenth && twentyEighth !== sixteenth && twentyEighth !== seventeenth && twentyEighth !== eighteenth && twentyEighth !== nineteenth && twentyEighth !== twentieth && twentyEighth !== twentyFirst && twentyEighth !== twentySecond && twentyEighth !== twentyThird && twentyEighth !== twentyFourth && twentyEighth !== twentyFifth && twentyEighth !== twentySixth && twentyEighth !== twentySeventh) {
            deduped.push(twentyEighth);
        }
        if (twentyNinth !== first && twentyNinth !== second && twentyNinth !== third && twentyNinth !== fourth && twentyNinth !== fifth && twentyNinth !== sixth && twentyNinth !== seventh && twentyNinth !== eighth && twentyNinth !== ninth && twentyNinth !== tenth && twentyNinth !== eleventh && twentyNinth !== twelfth && twentyNinth !== thirteenth && twentyNinth !== fourteenth && twentyNinth !== fifteenth && twentyNinth !== sixteenth && twentyNinth !== seventeenth && twentyNinth !== eighteenth && twentyNinth !== nineteenth && twentyNinth !== twentieth && twentyNinth !== twentyFirst && twentyNinth !== twentySecond && twentyNinth !== twentyThird && twentyNinth !== twentyFourth && twentyNinth !== twentyFifth && twentyNinth !== twentySixth && twentyNinth !== twentySeventh && twentyNinth !== twentyEighth) {
            deduped.push(twentyNinth);
        }
        if (thirtieth !== first && thirtieth !== second && thirtieth !== third && thirtieth !== fourth && thirtieth !== fifth && thirtieth !== sixth && thirtieth !== seventh && thirtieth !== eighth && thirtieth !== ninth && thirtieth !== tenth && thirtieth !== eleventh && thirtieth !== twelfth && thirtieth !== thirteenth && thirtieth !== fourteenth && thirtieth !== fifteenth && thirtieth !== sixteenth && thirtieth !== seventeenth && thirtieth !== eighteenth && thirtieth !== nineteenth && thirtieth !== twentieth && thirtieth !== twentyFirst && thirtieth !== twentySecond && thirtieth !== twentyThird && thirtieth !== twentyFourth && thirtieth !== twentyFifth && thirtieth !== twentySixth && thirtieth !== twentySeventh && thirtieth !== twentyEighth && thirtieth !== twentyNinth) {
            deduped.push(thirtieth);
        }
        if (thirtyFirst !== first && thirtyFirst !== second && thirtyFirst !== third && thirtyFirst !== fourth && thirtyFirst !== fifth && thirtyFirst !== sixth && thirtyFirst !== seventh && thirtyFirst !== eighth && thirtyFirst !== ninth && thirtyFirst !== tenth && thirtyFirst !== eleventh && thirtyFirst !== twelfth && thirtyFirst !== thirteenth && thirtyFirst !== fourteenth && thirtyFirst !== fifteenth && thirtyFirst !== sixteenth && thirtyFirst !== seventeenth && thirtyFirst !== eighteenth && thirtyFirst !== nineteenth && thirtyFirst !== twentieth && thirtyFirst !== twentyFirst && thirtyFirst !== twentySecond && thirtyFirst !== twentyThird && thirtyFirst !== twentyFourth && thirtyFirst !== twentyFifth && thirtyFirst !== twentySixth && thirtyFirst !== twentySeventh && thirtyFirst !== twentyEighth && thirtyFirst !== twentyNinth && thirtyFirst !== thirtieth) {
            deduped.push(thirtyFirst);
        }
        if (thirtySecond !== first && thirtySecond !== second && thirtySecond !== third && thirtySecond !== fourth && thirtySecond !== fifth && thirtySecond !== sixth && thirtySecond !== seventh && thirtySecond !== eighth && thirtySecond !== ninth && thirtySecond !== tenth && thirtySecond !== eleventh && thirtySecond !== twelfth && thirtySecond !== thirteenth && thirtySecond !== fourteenth && thirtySecond !== fifteenth && thirtySecond !== sixteenth && thirtySecond !== seventeenth && thirtySecond !== eighteenth && thirtySecond !== nineteenth && thirtySecond !== twentieth && thirtySecond !== twentyFirst && thirtySecond !== twentySecond && thirtySecond !== twentyThird && thirtySecond !== twentyFourth && thirtySecond !== twentyFifth && thirtySecond !== twentySixth && thirtySecond !== twentySeventh && thirtySecond !== twentyEighth && thirtySecond !== twentyNinth && thirtySecond !== thirtieth && thirtySecond !== thirtyFirst) {
            deduped.push(thirtySecond);
        }
        if (thirtyThird !== first && thirtyThird !== second && thirtyThird !== third && thirtyThird !== fourth && thirtyThird !== fifth && thirtyThird !== sixth && thirtyThird !== seventh && thirtyThird !== eighth && thirtyThird !== ninth && thirtyThird !== tenth && thirtyThird !== eleventh && thirtyThird !== twelfth && thirtyThird !== thirteenth && thirtyThird !== fourteenth && thirtyThird !== fifteenth && thirtyThird !== sixteenth && thirtyThird !== seventeenth && thirtyThird !== eighteenth && thirtyThird !== nineteenth && thirtyThird !== twentieth && thirtyThird !== twentyFirst && thirtyThird !== twentySecond && thirtyThird !== twentyThird && thirtyThird !== twentyFourth && thirtyThird !== twentyFifth && thirtyThird !== twentySixth && thirtyThird !== twentySeventh && thirtyThird !== twentyEighth && thirtyThird !== twentyNinth && thirtyThird !== thirtieth && thirtyThird !== thirtyFirst && thirtyThird !== thirtySecond) {
            deduped.push(thirtyThird);
        }

        cacheQueryTerms(query, deduped);
        return deduped;
    }

    const uniqueTerms: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (seen.has(token)) {
            continue;
        }
        seen.add(token);
        uniqueTerms.push(token);
    }
    cacheQueryTerms(query, uniqueTerms);
    return uniqueTerms;
};

const clearPostingSetCache = (): void => {
    postingSetCache.clear();
};

const getPostingSet = (term: string, ids: string[]): Set<string> => {
    const cached = postingSetCache.get(term);
    if (cached && cached.idsRef === ids) {
        postingSetCache.delete(term);
        postingSetCache.set(term, cached);
        return cached.idsSet;
    }
    const idsSet = new Set(ids);
    postingSetCache.delete(term);
    postingSetCache.set(term, { idsRef: ids, idsSet });
    if (postingSetCache.size > POSTING_SET_CACHE_LIMIT) {
        const oldestKey = postingSetCache.keys().next().value;
        if (oldestKey !== undefined) {
            postingSetCache.delete(oldestKey);
        }
    }
    return idsSet;
};

const createSingletonResult = (sessionId: string): Set<string> => {
    const result = new Set<string>();
    result.add(sessionId);
    return result;
};

const extractSessionTerms = (session: ChatSession): Set<string> => {
    const terms = new Set<string>();
    const titleTerms = SearchIndexService.tokenize(session.title);
    for (let i = 0; i < titleTerms.length; i++) {
        terms.add(titleTerms[i]);
    }

    const messages = session.messages as any[];
    for (let i = 0; i < messages.length; i++) {
        const content = messages[i]?.content;
        if (typeof content !== 'string') {
            continue;
        }
        const contentTerms = SearchIndexService.tokenize(content);
        for (let j = 0; j < contentTerms.length; j++) {
            terms.add(contentTerms[j]);
        }
    }

    return terms;
};

const removeSessionIdFromTerm = (index: InvertedIndex, term: string, sessionId: string): void => {
    const ids = index.terms[term];
    if (!ids || ids.length === 0) {
        return;
    }

    const firstMatchIndex = ids.indexOf(sessionId);
    if (firstMatchIndex === -1) {
        return;
    }

    if (firstMatchIndex === ids.length - 1) {
        if (firstMatchIndex === 0) {
            delete index.terms[term];
            return;
        }
        ids.length = firstMatchIndex;
        return;
    }

    let writeIndex = firstMatchIndex;
    for (let readIndex = firstMatchIndex + 1; readIndex < ids.length; readIndex++) {
        const currentId = ids[readIndex];
        if (currentId !== sessionId) {
            ids[writeIndex] = currentId;
            writeIndex++;
        }
    }

    if (writeIndex === 0) {
        delete index.terms[term];
        return;
    }

    ids.length = writeIndex;
};

export const SearchIndexService = {
    /**
     * Get the current index
     */
    getIndex: (): InvertedIndex => {
        try {
            const raw = localStorage.getItem(INDEX_STORAGE_KEY);
            if (indexCache && raw === indexCacheRaw) {
                return indexCache;
            }

            if (raw) {
                const parsed = JSON.parse(raw) as Partial<InvertedIndex>;
                const normalized = {
                    version: parsed.version || 1,
                    updatedAt: parsed.updatedAt || Date.now(),
                    terms: parsed.terms || {},
                    sessionTerms: parsed.sessionTerms || {},
                };
                indexCache = normalized;
                indexCacheRaw = raw;
                clearPostingSetCache();
                return normalized;
            }
            const empty = createEmptyIndex();
            indexCache = empty;
            indexCacheRaw = raw;
            clearPostingSetCache();
            return empty;
        } catch (e) {
            console.error('Failed to load search index', e);
            const empty = createEmptyIndex();
            indexCache = empty;
            indexCacheRaw = null;
            clearPostingSetCache();
            return empty;
        }
    },

    /**
     * Save the index
     */
    saveIndex: (index: InvertedIndex) => {
        try {
            index.updatedAt = Date.now();
            const raw = JSON.stringify(index);
            localStorage.setItem(INDEX_STORAGE_KEY, raw);
            indexCache = index;
            indexCacheRaw = raw;
            clearPostingSetCache();
        } catch (e) {
            console.error('Failed to save search index', e);
        }
    },

    /**
     * Tokenize text into unique terms
     */
    tokenize: (text: string): string[] => {
        const cached = tokenizeCache.get(text);
        if (cached) {
            return cached;
        }

        const rawTokens = text
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .split(/\s+/);
        const tokens: string[] = [];
        for (let i = 0; i < rawTokens.length; i++) {
            const term = rawTokens[i];
            if (term.length <= 2 || STOP_WORDS.has(term)) {
                continue;
            }
            tokens.push(term);
        }
        cacheTokenized(text, tokens);
        return tokens;
    },

    /**
     * Apply multiple index operations in one load/save cycle.
     */
    applyOperations: (operations: SearchIndexBatchOperation[]) => {
        if (operations.length === 0) return;
        const index = SearchIndexService.getIndex();
        let didChange = false;

        for (let opIndex = 0; opIndex < operations.length; opIndex++) {
            const operation = operations[opIndex];
            if (operation.kind === 'delete') {
                const previousTerms = index.sessionTerms[operation.sessionId] ?? EMPTY_TERMS;
                if (previousTerms === EMPTY_TERMS) {
                    continue;
                }
                SearchIndexService._removeSessionFromIndex(index, operation.sessionId, previousTerms);
                delete index.sessionTerms[operation.sessionId];
                didChange = true;
                continue;
            }

            const session = operation.session;
            const sessionId = session.id;
            const previousTerms = index.sessionTerms[sessionId] ?? EMPTY_TERMS;
            const terms = extractSessionTerms(session);
            const hasPreviousEntry = previousTerms !== EMPTY_TERMS;

            if (hasPreviousEntry && hasSameTerms(previousTerms, terms)) {
                continue;
            }

            SearchIndexService._removeSessionFromIndex(index, sessionId, previousTerms);
            const termCount = terms.size;
            if (termCount === 0) {
                if (hasPreviousEntry) {
                    delete index.sessionTerms[sessionId];
                    didChange = true;
                }
                continue;
            }
            const termList = Array.from(terms);
            const previousTermsLookup = hasPreviousEntry && previousTerms.length > 0
                ? new Set(previousTerms)
                : null;
            const indexTerms = index.terms;
            if (previousTermsLookup && previousTermsLookup.size > 0) {
                for (let termIndex = 0; termIndex < termList.length; termIndex++) {
                    const term = termList[termIndex];
                    let termIds = indexTerms[term];
                    if (!termIds) {
                        indexTerms[term] = [sessionId];
                        continue;
                    }
                    if (previousTermsLookup.has(term)) {
                        termIds.push(sessionId);
                        continue;
                    }
                    if (termIds.includes(sessionId)) {
                        continue;
                    }
                    termIds.push(sessionId);
                }
            } else {
                for (let termIndex = 0; termIndex < termList.length; termIndex++) {
                    const term = termList[termIndex];
                    let termIds = indexTerms[term];
                    if (!termIds) {
                        indexTerms[term] = [sessionId];
                        continue;
                    }
                    if (termIds.includes(sessionId)) {
                        continue;
                    }
                    termIds.push(sessionId);
                }
            }
            index.sessionTerms[sessionId] = termList;
            didChange = true;
        }

        if (didChange) {
            SearchIndexService.saveIndex(index);
        }
    },

    /**
     * Index a session (add/update)
     */
    indexSession: (session: ChatSession) => {
        SearchIndexService.applyOperations([{ kind: 'upsert', session }]);
    },

    /**
     * Remove a session from the index
     */
    removeSession: (sessionId: string) => {
        SearchIndexService.applyOperations([{ kind: 'delete', sessionId }]);
    },

    /**
     * Internal helper to remove session from index object
     */
    _removeSessionFromIndex: (index: InvertedIndex, sessionId: string, termsHint?: string[]) => {
        if (termsHint) {
            if (termsHint.length === 0) {
                return;
            }
            for (let i = 0; i < termsHint.length; i++) {
                removeSessionIdFromTerm(index, termsHint[i], sessionId);
            }
            return;
        }

        for (const term in index.terms) {
            if (!Object.prototype.hasOwnProperty.call(index.terms, term)) {
                continue;
            }
            removeSessionIdFromTerm(index, term, sessionId);
        }
    },

    /**
     * Search for sessions containing terms
     * Returns a Set of Session IDs
     */
    searchSessions: (query: string): Set<string> => {
        const index = SearchIndexService.getIndex();
        const queryTerms = getUniqueQueryTerms(query);
        const queryTermCount = queryTerms.length;
        if (queryTermCount === 0) {
            return new Set<string>();
        }
        if (queryTermCount === 1) {
            const ids = index.terms[queryTerms[0]];
            if (!ids || ids.length === 0) {
                return new Set<string>();
            }
            if (ids.length === 1) {
                const singleton = new Set<string>();
                singleton.add(ids[0]);
                return singleton;
            }
            return new Set(ids);
        }

        if (queryTermCount === 2) {
            const firstTerm = queryTerms[0];
            const secondTerm = queryTerms[1];
            const firstIds = index.terms[firstTerm];
            const secondIds = index.terms[secondTerm];

            if (!firstIds || firstIds.length === 0 || !secondIds || secondIds.length === 0) {
                return new Set<string>();
            }

            let resultIds: Set<string> | null = null;
            const scanFirstTerm = firstIds.length <= secondIds.length;
            const candidateIds = scanFirstTerm ? firstIds : secondIds;
            const membershipTerm = scanFirstTerm ? secondTerm : firstTerm;
            const membershipIds = scanFirstTerm ? secondIds : firstIds;
            if (candidateIds.length === 1) {
                const sessionId = candidateIds[0];
                if (membershipIds.includes(sessionId)) {
                    return createSingletonResult(sessionId);
                }
                return new Set<string>();
            }
            const membershipSet = getPostingSet(membershipTerm, membershipIds);

            for (let i = 0; i < candidateIds.length; i++) {
                const sessionId = candidateIds[i];
                if (membershipSet.has(sessionId)) {
                    if (!resultIds) {
                        resultIds = new Set<string>();
                    }
                    resultIds.add(sessionId);
                }
            }
            return resultIds ?? new Set<string>();
        }
        if (queryTermCount === 3) {
            const firstTerm = queryTerms[0];
            const secondTerm = queryTerms[1];
            const thirdTerm = queryTerms[2];
            const firstIds = index.terms[firstTerm];
            const secondIds = index.terms[secondTerm];
            const thirdIds = index.terms[thirdTerm];

            if (!firstIds || firstIds.length === 0 || !secondIds || secondIds.length === 0 || !thirdIds || thirdIds.length === 0) {
                return new Set<string>();
            }

            let resultIds: Set<string> | null = null;
            let candidateIds = firstIds;
            let membershipTermA = secondTerm;
            let membershipIdsA = secondIds;
            let membershipTermB = thirdTerm;
            let membershipIdsB = thirdIds;

            if (secondIds.length < candidateIds.length) {
                candidateIds = secondIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = thirdTerm;
                membershipIdsB = thirdIds;
            }
            if (thirdIds.length < candidateIds.length) {
                candidateIds = thirdIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
            }

            if (candidateIds.length === 1) {
                const sessionId = candidateIds[0];
                if (membershipIdsA.includes(sessionId) && membershipIdsB.includes(sessionId)) {
                    return createSingletonResult(sessionId);
                }
                return new Set<string>();
            }
            const membershipSetA = getPostingSet(membershipTermA, membershipIdsA);
            const membershipSetB = getPostingSet(membershipTermB, membershipIdsB);
            for (let i = 0; i < candidateIds.length; i++) {
                const sessionId = candidateIds[i];
                if (membershipSetA.has(sessionId) && membershipSetB.has(sessionId)) {
                    if (!resultIds) {
                        resultIds = new Set<string>();
                    }
                    resultIds.add(sessionId);
                }
            }
            return resultIds ?? new Set<string>();
        }
        if (queryTermCount === 4) {
            const firstTerm = queryTerms[0];
            const secondTerm = queryTerms[1];
            const thirdTerm = queryTerms[2];
            const fourthTerm = queryTerms[3];
            const firstIds = index.terms[firstTerm];
            const secondIds = index.terms[secondTerm];
            const thirdIds = index.terms[thirdTerm];
            const fourthIds = index.terms[fourthTerm];

            if (
                !firstIds || firstIds.length === 0 ||
                !secondIds || secondIds.length === 0 ||
                !thirdIds || thirdIds.length === 0 ||
                !fourthIds || fourthIds.length === 0
            ) {
                return new Set<string>();
            }

            let resultIds: Set<string> | null = null;
            let candidateIds = firstIds;
            let membershipTermA = secondTerm;
            let membershipIdsA = secondIds;
            let membershipTermB = thirdTerm;
            let membershipIdsB = thirdIds;
            let membershipTermC = fourthTerm;
            let membershipIdsC = fourthIds;

            if (secondIds.length < candidateIds.length) {
                candidateIds = secondIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = thirdTerm;
                membershipIdsB = thirdIds;
                membershipTermC = fourthTerm;
                membershipIdsC = fourthIds;
            }
            if (thirdIds.length < candidateIds.length) {
                candidateIds = thirdIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = fourthTerm;
                membershipIdsC = fourthIds;
            }
            if (fourthIds.length < candidateIds.length) {
                candidateIds = fourthIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = thirdTerm;
                membershipIdsC = thirdIds;
            }

            if (candidateIds.length === 1) {
                const sessionId = candidateIds[0];
                if (
                    membershipIdsA.includes(sessionId) &&
                    membershipIdsB.includes(sessionId) &&
                    membershipIdsC.includes(sessionId)
                ) {
                    return createSingletonResult(sessionId);
                }
                return new Set<string>();
            }
            const membershipSetA = getPostingSet(membershipTermA, membershipIdsA);
            const membershipSetB = getPostingSet(membershipTermB, membershipIdsB);
            const membershipSetC = getPostingSet(membershipTermC, membershipIdsC);
            for (let i = 0; i < candidateIds.length; i++) {
                const sessionId = candidateIds[i];
                if (membershipSetA.has(sessionId) && membershipSetB.has(sessionId) && membershipSetC.has(sessionId)) {
                    if (!resultIds) {
                        resultIds = new Set<string>();
                    }
                    resultIds.add(sessionId);
                }
            }
            return resultIds ?? new Set<string>();
        }
        if (queryTermCount === 5) {
            const firstTerm = queryTerms[0];
            const secondTerm = queryTerms[1];
            const thirdTerm = queryTerms[2];
            const fourthTerm = queryTerms[3];
            const fifthTerm = queryTerms[4];
            const firstIds = index.terms[firstTerm];
            const secondIds = index.terms[secondTerm];
            const thirdIds = index.terms[thirdTerm];
            const fourthIds = index.terms[fourthTerm];
            const fifthIds = index.terms[fifthTerm];

            if (
                !firstIds || firstIds.length === 0 ||
                !secondIds || secondIds.length === 0 ||
                !thirdIds || thirdIds.length === 0 ||
                !fourthIds || fourthIds.length === 0 ||
                !fifthIds || fifthIds.length === 0
            ) {
                return new Set<string>();
            }

            let resultIds: Set<string> | null = null;
            let candidateIds = firstIds;
            let membershipTermA = secondTerm;
            let membershipIdsA = secondIds;
            let membershipTermB = thirdTerm;
            let membershipIdsB = thirdIds;
            let membershipTermC = fourthTerm;
            let membershipIdsC = fourthIds;
            let membershipTermD = fifthTerm;
            let membershipIdsD = fifthIds;

            if (secondIds.length < candidateIds.length) {
                candidateIds = secondIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = thirdTerm;
                membershipIdsB = thirdIds;
                membershipTermC = fourthTerm;
                membershipIdsC = fourthIds;
                membershipTermD = fifthTerm;
                membershipIdsD = fifthIds;
            }
            if (thirdIds.length < candidateIds.length) {
                candidateIds = thirdIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = fourthTerm;
                membershipIdsC = fourthIds;
                membershipTermD = fifthTerm;
                membershipIdsD = fifthIds;
            }
            if (fourthIds.length < candidateIds.length) {
                candidateIds = fourthIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = thirdTerm;
                membershipIdsC = thirdIds;
                membershipTermD = fifthTerm;
                membershipIdsD = fifthIds;
            }
            if (fifthIds.length < candidateIds.length) {
                candidateIds = fifthIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = thirdTerm;
                membershipIdsC = thirdIds;
                membershipTermD = fourthTerm;
                membershipIdsD = fourthIds;
            }

            if (candidateIds.length === 1) {
                const sessionId = candidateIds[0];
                if (
                    membershipIdsA.includes(sessionId) &&
                    membershipIdsB.includes(sessionId) &&
                    membershipIdsC.includes(sessionId) &&
                    membershipIdsD.includes(sessionId)
                ) {
                    return createSingletonResult(sessionId);
                }
                return new Set<string>();
            }
            const membershipSetA = getPostingSet(membershipTermA, membershipIdsA);
            const membershipSetB = getPostingSet(membershipTermB, membershipIdsB);
            const membershipSetC = getPostingSet(membershipTermC, membershipIdsC);
            const membershipSetD = getPostingSet(membershipTermD, membershipIdsD);
            for (let i = 0; i < candidateIds.length; i++) {
                const sessionId = candidateIds[i];
                if (
                    membershipSetA.has(sessionId) &&
                    membershipSetB.has(sessionId) &&
                    membershipSetC.has(sessionId) &&
                    membershipSetD.has(sessionId)
                ) {
                    if (!resultIds) {
                        resultIds = new Set<string>();
                    }
                    resultIds.add(sessionId);
                }
            }
            return resultIds ?? new Set<string>();
        }
        if (queryTermCount === 6) {
            const firstTerm = queryTerms[0];
            const secondTerm = queryTerms[1];
            const thirdTerm = queryTerms[2];
            const fourthTerm = queryTerms[3];
            const fifthTerm = queryTerms[4];
            const sixthTerm = queryTerms[5];
            const firstIds = index.terms[firstTerm];
            const secondIds = index.terms[secondTerm];
            const thirdIds = index.terms[thirdTerm];
            const fourthIds = index.terms[fourthTerm];
            const fifthIds = index.terms[fifthTerm];
            const sixthIds = index.terms[sixthTerm];

            if (
                !firstIds || firstIds.length === 0 ||
                !secondIds || secondIds.length === 0 ||
                !thirdIds || thirdIds.length === 0 ||
                !fourthIds || fourthIds.length === 0 ||
                !fifthIds || fifthIds.length === 0 ||
                !sixthIds || sixthIds.length === 0
            ) {
                return new Set<string>();
            }

            let resultIds: Set<string> | null = null;
            let candidateIds = firstIds;
            let membershipTermA = secondTerm;
            let membershipIdsA = secondIds;
            let membershipTermB = thirdTerm;
            let membershipIdsB = thirdIds;
            let membershipTermC = fourthTerm;
            let membershipIdsC = fourthIds;
            let membershipTermD = fifthTerm;
            let membershipIdsD = fifthIds;
            let membershipTermE = sixthTerm;
            let membershipIdsE = sixthIds;

            if (secondIds.length < candidateIds.length) {
                candidateIds = secondIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = thirdTerm;
                membershipIdsB = thirdIds;
                membershipTermC = fourthTerm;
                membershipIdsC = fourthIds;
                membershipTermD = fifthTerm;
                membershipIdsD = fifthIds;
                membershipTermE = sixthTerm;
                membershipIdsE = sixthIds;
            }
            if (thirdIds.length < candidateIds.length) {
                candidateIds = thirdIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = fourthTerm;
                membershipIdsC = fourthIds;
                membershipTermD = fifthTerm;
                membershipIdsD = fifthIds;
                membershipTermE = sixthTerm;
                membershipIdsE = sixthIds;
            }
            if (fourthIds.length < candidateIds.length) {
                candidateIds = fourthIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = thirdTerm;
                membershipIdsC = thirdIds;
                membershipTermD = fifthTerm;
                membershipIdsD = fifthIds;
                membershipTermE = sixthTerm;
                membershipIdsE = sixthIds;
            }
            if (fifthIds.length < candidateIds.length) {
                candidateIds = fifthIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = thirdTerm;
                membershipIdsC = thirdIds;
                membershipTermD = fourthTerm;
                membershipIdsD = fourthIds;
                membershipTermE = sixthTerm;
                membershipIdsE = sixthIds;
            }
            if (sixthIds.length < candidateIds.length) {
                candidateIds = sixthIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = thirdTerm;
                membershipIdsC = thirdIds;
                membershipTermD = fourthTerm;
                membershipIdsD = fourthIds;
                membershipTermE = fifthTerm;
                membershipIdsE = fifthIds;
            }

            if (candidateIds.length === 1) {
                const sessionId = candidateIds[0];
                if (
                    membershipIdsA.includes(sessionId) &&
                    membershipIdsB.includes(sessionId) &&
                    membershipIdsC.includes(sessionId) &&
                    membershipIdsD.includes(sessionId) &&
                    membershipIdsE.includes(sessionId)
                ) {
                    return createSingletonResult(sessionId);
                }
                return new Set<string>();
            }

            const membershipSetA = getPostingSet(membershipTermA, membershipIdsA);
            const membershipSetB = getPostingSet(membershipTermB, membershipIdsB);
            const membershipSetC = getPostingSet(membershipTermC, membershipIdsC);
            const membershipSetD = getPostingSet(membershipTermD, membershipIdsD);
            const membershipSetE = getPostingSet(membershipTermE, membershipIdsE);
            for (let i = 0; i < candidateIds.length; i++) {
                const sessionId = candidateIds[i];
                if (
                    membershipSetA.has(sessionId) &&
                    membershipSetB.has(sessionId) &&
                    membershipSetC.has(sessionId) &&
                    membershipSetD.has(sessionId) &&
                    membershipSetE.has(sessionId)
                ) {
                    if (!resultIds) {
                        resultIds = new Set<string>();
                    }
                    resultIds.add(sessionId);
                }
            }
            return resultIds ?? new Set<string>();
        }
        if (queryTermCount === 7) {
            const firstTerm = queryTerms[0];
            const secondTerm = queryTerms[1];
            const thirdTerm = queryTerms[2];
            const fourthTerm = queryTerms[3];
            const fifthTerm = queryTerms[4];
            const sixthTerm = queryTerms[5];
            const seventhTerm = queryTerms[6];
            const firstIds = index.terms[firstTerm];
            const secondIds = index.terms[secondTerm];
            const thirdIds = index.terms[thirdTerm];
            const fourthIds = index.terms[fourthTerm];
            const fifthIds = index.terms[fifthTerm];
            const sixthIds = index.terms[sixthTerm];
            const seventhIds = index.terms[seventhTerm];

            if (
                !firstIds || firstIds.length === 0 ||
                !secondIds || secondIds.length === 0 ||
                !thirdIds || thirdIds.length === 0 ||
                !fourthIds || fourthIds.length === 0 ||
                !fifthIds || fifthIds.length === 0 ||
                !sixthIds || sixthIds.length === 0 ||
                !seventhIds || seventhIds.length === 0
            ) {
                return new Set<string>();
            }

            let resultIds: Set<string> | null = null;
            let candidateIds = firstIds;
            let membershipTermA = secondTerm;
            let membershipIdsA = secondIds;
            let membershipTermB = thirdTerm;
            let membershipIdsB = thirdIds;
            let membershipTermC = fourthTerm;
            let membershipIdsC = fourthIds;
            let membershipTermD = fifthTerm;
            let membershipIdsD = fifthIds;
            let membershipTermE = sixthTerm;
            let membershipIdsE = sixthIds;
            let membershipTermF = seventhTerm;
            let membershipIdsF = seventhIds;

            if (secondIds.length < candidateIds.length) {
                candidateIds = secondIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = thirdTerm;
                membershipIdsB = thirdIds;
                membershipTermC = fourthTerm;
                membershipIdsC = fourthIds;
                membershipTermD = fifthTerm;
                membershipIdsD = fifthIds;
                membershipTermE = sixthTerm;
                membershipIdsE = sixthIds;
                membershipTermF = seventhTerm;
                membershipIdsF = seventhIds;
            }
            if (thirdIds.length < candidateIds.length) {
                candidateIds = thirdIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = fourthTerm;
                membershipIdsC = fourthIds;
                membershipTermD = fifthTerm;
                membershipIdsD = fifthIds;
                membershipTermE = sixthTerm;
                membershipIdsE = sixthIds;
                membershipTermF = seventhTerm;
                membershipIdsF = seventhIds;
            }
            if (fourthIds.length < candidateIds.length) {
                candidateIds = fourthIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = thirdTerm;
                membershipIdsC = thirdIds;
                membershipTermD = fifthTerm;
                membershipIdsD = fifthIds;
                membershipTermE = sixthTerm;
                membershipIdsE = sixthIds;
                membershipTermF = seventhTerm;
                membershipIdsF = seventhIds;
            }
            if (fifthIds.length < candidateIds.length) {
                candidateIds = fifthIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = thirdTerm;
                membershipIdsC = thirdIds;
                membershipTermD = fourthTerm;
                membershipIdsD = fourthIds;
                membershipTermE = sixthTerm;
                membershipIdsE = sixthIds;
                membershipTermF = seventhTerm;
                membershipIdsF = seventhIds;
            }
            if (sixthIds.length < candidateIds.length) {
                candidateIds = sixthIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = thirdTerm;
                membershipIdsC = thirdIds;
                membershipTermD = fourthTerm;
                membershipIdsD = fourthIds;
                membershipTermE = fifthTerm;
                membershipIdsE = fifthIds;
                membershipTermF = seventhTerm;
                membershipIdsF = seventhIds;
            }
            if (seventhIds.length < candidateIds.length) {
                candidateIds = seventhIds;
                membershipTermA = firstTerm;
                membershipIdsA = firstIds;
                membershipTermB = secondTerm;
                membershipIdsB = secondIds;
                membershipTermC = thirdTerm;
                membershipIdsC = thirdIds;
                membershipTermD = fourthTerm;
                membershipIdsD = fourthIds;
                membershipTermE = fifthTerm;
                membershipIdsE = fifthIds;
                membershipTermF = sixthTerm;
                membershipIdsF = sixthIds;
            }

            if (candidateIds.length === 1) {
                const sessionId = candidateIds[0];
                if (
                    membershipIdsA.includes(sessionId) &&
                    membershipIdsB.includes(sessionId) &&
                    membershipIdsC.includes(sessionId) &&
                    membershipIdsD.includes(sessionId) &&
                    membershipIdsE.includes(sessionId) &&
                    membershipIdsF.includes(sessionId)
                ) {
                    return createSingletonResult(sessionId);
                }
                return new Set<string>();
            }

            const membershipSetA = getPostingSet(membershipTermA, membershipIdsA);
            const membershipSetB = getPostingSet(membershipTermB, membershipIdsB);
            const membershipSetC = getPostingSet(membershipTermC, membershipIdsC);
            const membershipSetD = getPostingSet(membershipTermD, membershipIdsD);
            const membershipSetE = getPostingSet(membershipTermE, membershipIdsE);
            const membershipSetF = getPostingSet(membershipTermF, membershipIdsF);
            for (let i = 0; i < candidateIds.length; i++) {
                const sessionId = candidateIds[i];
                if (
                    membershipSetA.has(sessionId) &&
                    membershipSetB.has(sessionId) &&
                    membershipSetC.has(sessionId) &&
                    membershipSetD.has(sessionId) &&
                    membershipSetE.has(sessionId) &&
                    membershipSetF.has(sessionId)
                ) {
                    if (!resultIds) {
                        resultIds = new Set<string>();
                    }
                    resultIds.add(sessionId);
                }
            }
            return resultIds ?? new Set<string>();
        }
        if (queryTermCount === 8) {
            const term0 = queryTerms[0];
            const term1 = queryTerms[1];
            const term2 = queryTerms[2];
            const term3 = queryTerms[3];
            const term4 = queryTerms[4];
            const term5 = queryTerms[5];
            const term6 = queryTerms[6];
            const term7 = queryTerms[7];
            const ids0 = index.terms[term0];
            const ids1 = index.terms[term1];
            const ids2 = index.terms[term2];
            const ids3 = index.terms[term3];
            const ids4 = index.terms[term4];
            const ids5 = index.terms[term5];
            const ids6 = index.terms[term6];
            const ids7 = index.terms[term7];

            if (
                !ids0 || ids0.length === 0 ||
                !ids1 || ids1.length === 0 ||
                !ids2 || ids2.length === 0 ||
                !ids3 || ids3.length === 0 ||
                !ids4 || ids4.length === 0 ||
                !ids5 || ids5.length === 0 ||
                !ids6 || ids6.length === 0 ||
                !ids7 || ids7.length === 0
            ) {
                return new Set<string>();
            }

            let smallestIndex = 0;
            let candidateIds = ids0;
            if (ids1.length < candidateIds.length) {
                smallestIndex = 1;
                candidateIds = ids1;
            }
            if (ids2.length < candidateIds.length) {
                smallestIndex = 2;
                candidateIds = ids2;
            }
            if (ids3.length < candidateIds.length) {
                smallestIndex = 3;
                candidateIds = ids3;
            }
            if (ids4.length < candidateIds.length) {
                smallestIndex = 4;
                candidateIds = ids4;
            }
            if (ids5.length < candidateIds.length) {
                smallestIndex = 5;
                candidateIds = ids5;
            }
            if (ids6.length < candidateIds.length) {
                smallestIndex = 6;
                candidateIds = ids6;
            }
            if (ids7.length < candidateIds.length) {
                smallestIndex = 7;
                candidateIds = ids7;
            }

            if (candidateIds.length === 1) {
                const sessionId = candidateIds[0];
                if (
                    (smallestIndex === 0 || ids0.includes(sessionId)) &&
                    (smallestIndex === 1 || ids1.includes(sessionId)) &&
                    (smallestIndex === 2 || ids2.includes(sessionId)) &&
                    (smallestIndex === 3 || ids3.includes(sessionId)) &&
                    (smallestIndex === 4 || ids4.includes(sessionId)) &&
                    (smallestIndex === 5 || ids5.includes(sessionId)) &&
                    (smallestIndex === 6 || ids6.includes(sessionId)) &&
                    (smallestIndex === 7 || ids7.includes(sessionId))
                ) {
                    return createSingletonResult(sessionId);
                }
                return new Set<string>();
            }

            const membershipSet0 = smallestIndex === 0 ? null : getPostingSet(term0, ids0);
            const membershipSet1 = smallestIndex === 1 ? null : getPostingSet(term1, ids1);
            const membershipSet2 = smallestIndex === 2 ? null : getPostingSet(term2, ids2);
            const membershipSet3 = smallestIndex === 3 ? null : getPostingSet(term3, ids3);
            const membershipSet4 = smallestIndex === 4 ? null : getPostingSet(term4, ids4);
            const membershipSet5 = smallestIndex === 5 ? null : getPostingSet(term5, ids5);
            const membershipSet6 = smallestIndex === 6 ? null : getPostingSet(term6, ids6);
            const membershipSet7 = smallestIndex === 7 ? null : getPostingSet(term7, ids7);

            let resultIds: Set<string> | null = null;
            for (let i = 0; i < candidateIds.length; i++) {
                const sessionId = candidateIds[i];
                if (
                    (membershipSet0 === null || membershipSet0.has(sessionId)) &&
                    (membershipSet1 === null || membershipSet1.has(sessionId)) &&
                    (membershipSet2 === null || membershipSet2.has(sessionId)) &&
                    (membershipSet3 === null || membershipSet3.has(sessionId)) &&
                    (membershipSet4 === null || membershipSet4.has(sessionId)) &&
                    (membershipSet5 === null || membershipSet5.has(sessionId)) &&
                    (membershipSet6 === null || membershipSet6.has(sessionId)) &&
                    (membershipSet7 === null || membershipSet7.has(sessionId))
                ) {
                    if (!resultIds) {
                        resultIds = new Set<string>();
                    }
                    resultIds.add(sessionId);
                }
            }
            return resultIds ?? new Set<string>();
        }
        if (queryTermCount === 9) {
            const term0 = queryTerms[0];
            const term1 = queryTerms[1];
            const term2 = queryTerms[2];
            const term3 = queryTerms[3];
            const term4 = queryTerms[4];
            const term5 = queryTerms[5];
            const term6 = queryTerms[6];
            const term7 = queryTerms[7];
            const term8 = queryTerms[8];
            const ids0 = index.terms[term0];
            const ids1 = index.terms[term1];
            const ids2 = index.terms[term2];
            const ids3 = index.terms[term3];
            const ids4 = index.terms[term4];
            const ids5 = index.terms[term5];
            const ids6 = index.terms[term6];
            const ids7 = index.terms[term7];
            const ids8 = index.terms[term8];

            if (
                !ids0 || ids0.length === 0 ||
                !ids1 || ids1.length === 0 ||
                !ids2 || ids2.length === 0 ||
                !ids3 || ids3.length === 0 ||
                !ids4 || ids4.length === 0 ||
                !ids5 || ids5.length === 0 ||
                !ids6 || ids6.length === 0 ||
                !ids7 || ids7.length === 0 ||
                !ids8 || ids8.length === 0
            ) {
                return new Set<string>();
            }

            let smallestIndex = 0;
            let candidateIds = ids0;
            if (ids1.length < candidateIds.length) {
                smallestIndex = 1;
                candidateIds = ids1;
            }
            if (ids2.length < candidateIds.length) {
                smallestIndex = 2;
                candidateIds = ids2;
            }
            if (ids3.length < candidateIds.length) {
                smallestIndex = 3;
                candidateIds = ids3;
            }
            if (ids4.length < candidateIds.length) {
                smallestIndex = 4;
                candidateIds = ids4;
            }
            if (ids5.length < candidateIds.length) {
                smallestIndex = 5;
                candidateIds = ids5;
            }
            if (ids6.length < candidateIds.length) {
                smallestIndex = 6;
                candidateIds = ids6;
            }
            if (ids7.length < candidateIds.length) {
                smallestIndex = 7;
                candidateIds = ids7;
            }
            if (ids8.length < candidateIds.length) {
                smallestIndex = 8;
                candidateIds = ids8;
            }

            if (candidateIds.length === 1) {
                const sessionId = candidateIds[0];
                if (
                    (smallestIndex === 0 || ids0.includes(sessionId)) &&
                    (smallestIndex === 1 || ids1.includes(sessionId)) &&
                    (smallestIndex === 2 || ids2.includes(sessionId)) &&
                    (smallestIndex === 3 || ids3.includes(sessionId)) &&
                    (smallestIndex === 4 || ids4.includes(sessionId)) &&
                    (smallestIndex === 5 || ids5.includes(sessionId)) &&
                    (smallestIndex === 6 || ids6.includes(sessionId)) &&
                    (smallestIndex === 7 || ids7.includes(sessionId)) &&
                    (smallestIndex === 8 || ids8.includes(sessionId))
                ) {
                    return createSingletonResult(sessionId);
                }
                return new Set<string>();
            }

            const membershipSet0 = smallestIndex === 0 ? null : getPostingSet(term0, ids0);
            const membershipSet1 = smallestIndex === 1 ? null : getPostingSet(term1, ids1);
            const membershipSet2 = smallestIndex === 2 ? null : getPostingSet(term2, ids2);
            const membershipSet3 = smallestIndex === 3 ? null : getPostingSet(term3, ids3);
            const membershipSet4 = smallestIndex === 4 ? null : getPostingSet(term4, ids4);
            const membershipSet5 = smallestIndex === 5 ? null : getPostingSet(term5, ids5);
            const membershipSet6 = smallestIndex === 6 ? null : getPostingSet(term6, ids6);
            const membershipSet7 = smallestIndex === 7 ? null : getPostingSet(term7, ids7);
            const membershipSet8 = smallestIndex === 8 ? null : getPostingSet(term8, ids8);

            let resultIds: Set<string> | null = null;
            for (let i = 0; i < candidateIds.length; i++) {
                const sessionId = candidateIds[i];
                if (
                    (membershipSet0 === null || membershipSet0.has(sessionId)) &&
                    (membershipSet1 === null || membershipSet1.has(sessionId)) &&
                    (membershipSet2 === null || membershipSet2.has(sessionId)) &&
                    (membershipSet3 === null || membershipSet3.has(sessionId)) &&
                    (membershipSet4 === null || membershipSet4.has(sessionId)) &&
                    (membershipSet5 === null || membershipSet5.has(sessionId)) &&
                    (membershipSet6 === null || membershipSet6.has(sessionId)) &&
                    (membershipSet7 === null || membershipSet7.has(sessionId)) &&
                    (membershipSet8 === null || membershipSet8.has(sessionId))
                ) {
                    if (!resultIds) {
                        resultIds = new Set<string>();
                    }
                    resultIds.add(sessionId);
                }
            }
            return resultIds ?? new Set<string>();
        }

        const initialIds = index.terms[queryTerms[0]];
        if (!initialIds || initialIds.length === 0) {
            return new Set<string>();
        }
        let smallestTermIndex = 0;
        let firstIds: string[] = initialIds;
        for (let i = 1; i < queryTerms.length; i++) {
            const ids = index.terms[queryTerms[i]];
            if (!ids || ids.length === 0) {
                return new Set<string>();
            }
            if (ids.length < firstIds.length) {
                smallestTermIndex = i;
                firstIds = ids;
            }
        }

        if (firstIds.length === 1) {
            const sessionId = firstIds[0];
            for (let i = 0; i < queryTerms.length; i++) {
                if (i === smallestTermIndex) {
                    continue;
                }
                const ids = index.terms[queryTerms[i]]!;
                if (!ids.includes(sessionId)) {
                    return new Set<string>();
                }
            }
            return createSingletonResult(sessionId);
        }

        const remainingTermCount = queryTerms.length - 1;
        if (remainingTermSetScratch.length < remainingTermCount) {
            remainingTermSetScratch.length = remainingTermCount;
        }
        const remainingTermSets = remainingTermSetScratch;
        let remainingTermSetIndex = 0;
        for (let i = 0; i < smallestTermIndex; i++) {
            const term = queryTerms[i];
            const ids = index.terms[term]!;
            remainingTermSets[remainingTermSetIndex] = getPostingSet(term, ids);
            remainingTermSetIndex++;
        }
        for (let i = smallestTermIndex + 1; i < queryTerms.length; i++) {
            const term = queryTerms[i];
            const ids = index.terms[term]!;
            remainingTermSets[remainingTermSetIndex] = getPostingSet(term, ids);
            remainingTermSetIndex++;
        }

        let resultIds: Set<string> | null = null;
        // Scan candidates from the smallest posting list once.
        for (let i = 0; i < firstIds.length; i++) {
            const sessionId = firstIds[i];
            let matchesAll = true;

            for (let j = 0; j < remainingTermCount; j++) {
                if (!remainingTermSets[j].has(sessionId)) {
                    matchesAll = false;
                    break;
                }
            }

            if (matchesAll) {
                if (!resultIds) {
                    resultIds = new Set<string>();
                }
                resultIds.add(sessionId);
            }
        }

        return resultIds ?? new Set<string>();
    },

    /**
     * Rebuild entire index from History (useful for migration)
     * Note: This assumes HistoryService is available and updated to return all sessions
     */
    rebuildIndex: (sessions: ChatSession[]) => {
        const index: InvertedIndex = { version: 1, updatedAt: Date.now(), terms: {}, sessionTerms: {} };

        for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex++) {
            const session = sessions[sessionIndex];
            const terms = extractSessionTerms(session);
            if (terms.size === 0) {
                continue;
            }
            const termList = Array.from(terms);
            index.sessionTerms[session.id] = termList;

            for (let termIndex = 0; termIndex < termList.length; termIndex++) {
                const term = termList[termIndex];
                if (!index.terms[term]) {
                    index.terms[term] = [];
                }
                index.terms[term].push(session.id);
            }
        }

        SearchIndexService.saveIndex(index);
    }
};
