
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 *
 * IMPORTANT! The caller of this hook MUST MEMOIZE the inputted targetRefOrQuery
 * using `useMemo` to prevent infinite render loops.
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    targetRefOrQuery: CollectionReference<DocumentData> | Query<DocumentData> | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  // The path string is a stable primitive value that can be used in the dependency array.
  const queryPath = useMemo(() => {
    if (!targetRefOrQuery) return null;
    
    // For CollectionReference, .path is public and stable.
    if (targetRefOrQuery.type === 'collection') {
        return (targetRefOrQuery as CollectionReference).path;
    }
    
    // For Query, we need a stable representation. The internal _query object is not guaranteed API,
    // but it's the most common way to get a stable path. We'll add fallbacks.
    try {
        const internalQuery = targetRefOrQuery as unknown as InternalQuery;
        if (internalQuery._query?.path?.canonicalString) {
            return internalQuery._query.path.canonicalString();
        }
    } catch {
       // If internal access fails, fall back to stringifying the query object.
       // This is less ideal as it might change more often, but better than nothing.
       // NOTE: This fallback path is a potential source of loops if query objects are not memoized by the caller.
    }
    return JSON.stringify(targetRefOrQuery); // Fallback string representation
  }, [targetRefOrQuery]);


  useEffect(() => {
    if (!targetRefOrQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      targetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        // This logic extracts the path from either a ref or a query
        const path: string | null = queryPath;

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path: path || 'unknown_path',
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        // trigger global error propagation
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => unsubscribe();
  }, [queryPath]); // Re-run only when the actual query path changes
  
  return { data, isLoading, error };
}
