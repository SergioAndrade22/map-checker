/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Category } from '../utils/mapLogic';

export interface MapDocument {
  id: string;
  title: string;
  ownerId: string;
  ownerEmail: string;
  ownerDisplayName: string;
  categories: Category[];
  collaboratorIds: string[];
  createdAt: any;
  updatedAt: any;
}

export interface UserCategorization {
  id: string;
  mapId: string;
  userId: string;
  userName: string;
  userEmail: string;
  assignments: Record<string, string>; // countryId -> categoryId
  updatedAt: any;
}

export interface CountryNoteItem {
  id: string; // e.g. noteId
  mapId: string;
  countryId: string;
  countryName: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  createdAt: any;
  updatedAt: any;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-visited', name: 'Visited', color: '#10B981' },
  { id: 'cat-bucketlist', name: 'Bucket List', color: '#F43F5E' },
  { id: 'cat-wanttogo', name: 'Want to Go', color: '#3B82F6' },
  { id: 'cat-livedthere', name: 'Lived There', color: '#8B5CF6' },
  { id: 'cat-favorite', name: 'Favorite Trip', color: '#F59E0B' },
];

/**
 * Create a new Map document in Firestore
 */
export async function createMap(
  title: string,
  user: { uid: string; email?: string | null; displayName?: string | null }
): Promise<string> {
  const mapId = 'map_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const path = `maps/${mapId}`;

  try {
    const newMap: MapDocument = {
      id: mapId,
      title: title || 'My World Map',
      ownerId: user.uid,
      ownerEmail: user.email || 'user@example.com',
      ownerDisplayName: user.displayName || 'Cartographer',
      categories: DEFAULT_CATEGORIES,
      collaboratorIds: [user.uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'maps', mapId), newMap);

    // Initial categorization document for owner
    await setDoc(doc(db, 'maps', mapId, 'categorizations', user.uid), {
      id: user.uid,
      mapId,
      userId: user.uid,
      userName: user.displayName || 'Owner',
      userEmail: user.email || '',
      assignments: {},
      updatedAt: serverTimestamp(),
    });

    return mapId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/**
 * Join an existing map as collaborator
 */
export async function joinMapCollaborator(
  mapId: string,
  user: { uid: string; email?: string | null; displayName?: string | null }
): Promise<void> {
  const mapRef = doc(db, 'maps', mapId);
  try {
    const snap = await getDoc(mapRef);
    if (!snap.exists()) return;

    const data = snap.data() as MapDocument;
    const collabs = new Set(data.collaboratorIds || []);
    if (!collabs.has(user.uid)) {
      collabs.add(user.uid);
      await updateDoc(mapRef, {
        collaboratorIds: Array.from(collabs),
        updatedAt: serverTimestamp(),
      });
    }

    // Ensure user's categorization doc exists
    const userCatRef = doc(db, 'maps', mapId, 'categorizations', user.uid);
    const catSnap = await getDoc(userCatRef);
    if (!catSnap.exists()) {
      await setDoc(userCatRef, {
        id: user.uid,
        mapId,
        userId: user.uid,
        userName: user.displayName || 'Collaborator',
        userEmail: user.email || '',
        assignments: {},
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn('Could not auto-join map as collaborator:', err);
  }
}

/**
 * Subscribe to a Map document
 */
export function subscribeToMap(
  mapId: string,
  onUpdate: (map: MapDocument | null) => void
): () => void {
  const path = `maps/${mapId}`;
  return onSnapshot(
    doc(db, 'maps', mapId),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as MapDocument);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

/**
 * Update Categories on a Map (Owner only)
 */
export async function updateMapCategories(
  mapId: string,
  categories: Category[]
): Promise<void> {
  const path = `maps/${mapId}`;
  try {
    await updateDoc(doc(db, 'maps', mapId), {
      categories,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Update Map Title
 */
export async function updateMapTitle(mapId: string, title: string): Promise<void> {
  const path = `maps/${mapId}`;
  try {
    await updateDoc(doc(db, 'maps', mapId), {
      title,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Subscribe to all users' categorizations for this map
 */
export function subscribeToAllCategorizations(
  mapId: string,
  onUpdate: (categorizations: Record<string, UserCategorization>) => void
): () => void {
  const path = `maps/${mapId}/categorizations`;
  return onSnapshot(
    collection(db, 'maps', mapId, 'categorizations'),
    (snapshot) => {
      const records: Record<string, UserCategorization> = {};
      snapshot.forEach((d) => {
        records[d.id] = d.data() as UserCategorization;
      });
      onUpdate(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Update a user's country assignment
 */
export async function setCountryAssignment(
  mapId: string,
  userId: string,
  userName: string,
  userEmail: string,
  countryId: string,
  categoryId: string | null
): Promise<void> {
  const userCatRef = doc(db, 'maps', mapId, 'categorizations', userId);
  const path = `maps/${mapId}/categorizations/${userId}`;

  try {
    const snap = await getDoc(userCatRef);
    let assignments: Record<string, string> = {};

    if (snap.exists()) {
      assignments = { ...(snap.data().assignments || {}) };
    }

    if (categoryId) {
      assignments[countryId] = categoryId;
    } else {
      delete assignments[countryId];
    }

    await setDoc(
      userCatRef,
      {
        id: userId,
        mapId,
        userId,
        userName,
        userEmail,
        assignments,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Subscribe to notes on a map
 */
export function subscribeToNotes(
  mapId: string,
  onUpdate: (notes: CountryNoteItem[]) => void
): () => void {
  const path = `maps/${mapId}/notes`;
  return onSnapshot(
    collection(db, 'maps', mapId, 'notes'),
    (snapshot) => {
      const notes: CountryNoteItem[] = [];
      snapshot.forEach((d) => {
        notes.push({ ...d.data(), id: d.id } as CountryNoteItem);
      });
      onUpdate(notes);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Save or update a country note for a user
 */
export async function saveCountryNote(
  mapId: string,
  countryId: string,
  countryName: string,
  user: { uid: string; email?: string | null; displayName?: string | null },
  content: string,
  existingNoteId?: string
): Promise<void> {
  const noteId = existingNoteId || `${countryId}_${user.uid}`;
  const path = `maps/${mapId}/notes/${noteId}`;

  try {
    const noteData: CountryNoteItem = {
      id: noteId,
      mapId,
      countryId,
      countryName,
      authorId: user.uid,
      authorName: user.displayName || 'Collaborator',
      authorEmail: user.email || '',
      content: content.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'maps', mapId, 'notes', noteId), noteData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Delete a country note
 */
export async function deleteCountryNote(
  mapId: string,
  noteId: string
): Promise<void> {
  const path = `maps/${mapId}/notes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'maps', mapId, 'notes', noteId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
