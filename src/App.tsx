/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import { auth, loginWithGoogle, logoutUser, testConnection } from './lib/firebase';
import {
  MapDocument,
  UserCategorization,
  CountryNoteItem,
  DEFAULT_CATEGORIES,
  createMap,
  joinMapCollaborator,
  subscribeToMap,
  subscribeToAllCategorizations,
  subscribeToNotes,
  setCountryAssignment,
  updateMapCategories,
  updateMapTitle,
  saveCountryNote,
  deleteCountryNote,
} from './services/mapService';
import { useWorldAtlas } from './hooks/useWorldAtlas';
import { COUNTRIES_DATA, getCountryMeta } from './data/countries';
import {
  Category,
  CountryMetadata,
  calculateCategoryStats,
  compareCategorizations,
} from './utils/mapLogic';
import { Navbar } from './components/Navbar';
import { WorldMap } from './components/WorldMap';
import { CountryCard } from './components/CountryCard';
import { CategoryLegend } from './components/CategoryLegend';
import { ComparisonPanel } from './components/ComparisonPanel';
import { ShareModal } from './components/ShareModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { features, loading: atlasLoading } = useWorldAtlas();

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Map Document & Real-time Data
  const [mapId, setMapId] = useState<string | null>(null);
  const [mapDoc, setMapDoc] = useState<MapDocument | null>(null);
  const [allCategorizations, setAllCategorizations] = useState<Record<string, UserCategorization>>({});
  const [allNotes, setAllNotes] = useState<CountryNoteItem[]>([]);

  // Local fallback assignments & notes if not synced to Firebase
  const [localCategories, setLocalCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [localAssignments, setLocalAssignments] = useState<Record<string, string>>({
    '076': 'cat-bucketlist', // Brazil initially highlighted matching screenshot!
    '250': 'cat-visited',    // France
  });
  const [localNotes, setLocalNotes] = useState<CountryNoteItem[]>([
    {
      id: 'local_note_1',
      mapId: 'local',
      countryId: '076',
      countryName: 'Brazil',
      authorId: 'local_guest',
      authorName: 'Demo Traveler',
      authorEmail: '',
      content: 'Amazing hiking in Rio and Iguazu Falls! Plan to visit again next year.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  // UI States
  const [selectedCountry, setSelectedCountry] = useState<CountryMetadata | null>(() =>
    getCountryMeta('076', 'Brazil')
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null); // Paintbrush mode
  const [viewMode, setViewMode] = useState<string>('my'); // 'my', 'compare', or specific collaborator userId
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // 1. Initialize Auth and check map ID from URL query
  useEffect(() => {
    testConnection();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });

    const params = new URLSearchParams(window.location.search);
    const queryMapId = params.get('map');
    if (queryMapId) {
      setMapId(queryMapId);
    }

    return () => unsubscribeAuth();
  }, []);

  // 2. If user is logged in and map exists, join as collaborator
  useEffect(() => {
    if (authReady && currentUser && mapId) {
      joinMapCollaborator(mapId, currentUser);
    }
  }, [authReady, currentUser, mapId]);

  // 3. Realtime subscriptions to Firestore
  useEffect(() => {
    if (!mapId) return;

    const unsubMap = subscribeToMap(mapId, (m) => {
      if (m) setMapDoc(m);
    });

    const unsubCats = subscribeToAllCategorizations(mapId, (cats) => {
      setAllCategorizations(cats);
    });

    const unsubNotes = subscribeToNotes(mapId, (notes) => {
      setAllNotes(notes);
    });

    return () => {
      unsubMap();
      unsubCats();
      unsubNotes();
    };
  }, [mapId]);

  // Active Categories
  const currentCategories = useMemo(() => {
    if (mapDoc && mapDoc.categories?.length > 0) {
      return mapDoc.categories;
    }
    return localCategories;
  }, [mapDoc, localCategories]);

  // Current active user's assignments
  const myAssignments = useMemo(() => {
    if (currentUser && mapId && allCategorizations[currentUser.uid]) {
      return allCategorizations[currentUser.uid].assignments || {};
    }
    return localAssignments;
  }, [currentUser, mapId, allCategorizations, localAssignments]);

  // Currently displayed assignments based on viewMode
  const activeDisplayedAssignments = useMemo(() => {
    if (viewMode === 'my' || viewMode === 'compare') {
      return myAssignments;
    }
    if (allCategorizations[viewMode]) {
      return allCategorizations[viewMode].assignments || {};
    }
    return myAssignments;
  }, [viewMode, myAssignments, allCategorizations]);

  // Categorization comparison data
  const comparisonData = useMemo(() => {
    if (viewMode !== 'compare') return null;

    const collabEntries = Object.entries(allCategorizations).filter(
      ([uid]) => uid !== currentUser?.uid
    );
    const partner = collabEntries[0]?.[1];
    const partnerAssignments = partner?.assignments || {};

    return {
      isCompareMode: true,
      userAAssignments: myAssignments,
      userBAAssignments: partnerAssignments,
      partnerName: partner?.userName || 'Collaborator',
    };
  }, [viewMode, allCategorizations, currentUser, myAssignments]);

  const comparisonStats = useMemo(() => {
    if (!comparisonData) return null;
    return compareCategorizations(
      comparisonData.userAAssignments,
      comparisonData.userBAAssignments
    );
  }, [comparisonData]);

  // Category breakdown stats for active view
  const categoryStats = useMemo(() => {
    return calculateCategoryStats(
      currentCategories,
      activeDisplayedAssignments,
      features.length || 195
    );
  }, [currentCategories, activeDisplayedAssignments, features.length]);

  const totalCategorizedCount = useMemo(() => {
    return Object.keys(activeDisplayedAssignments).length;
  }, [activeDisplayedAssignments]);

  // Notes for selected country
  const selectedCountryNotes = useMemo(() => {
    if (!selectedCountry) return [];
    const notesSource = mapId ? allNotes : localNotes;
    return notesSource.filter((n) => n.countryId === selectedCountry.id);
  }, [selectedCountry, mapId, allNotes, localNotes]);

  // Assigned category for selected country in active view
  const selectedCountryCategory = useMemo(() => {
    if (!selectedCountry) return null;
    const catId = activeDisplayedAssignments[selectedCountry.id];
    return currentCategories.find((c) => c.id === catId) || null;
  }, [selectedCountry, activeDisplayedAssignments, currentCategories]);

  // Handlers
  const handleSelectCountryById = useCallback(
    (id: string, fallbackName?: string) => {
      const meta = getCountryMeta(id, fallbackName);
      setSelectedCountry(meta);

      // If active paintbrush category is selected, paint directly!
      if (activeCategoryId) {
        handleAssignCategory(id, activeCategoryId);
      }
    },
    [activeCategoryId]
  );

  const handleAssignCategory = async (countryId: string, categoryId: string | null) => {
    if (currentUser && mapId) {
      await setCountryAssignment(
        mapId,
        currentUser.uid,
        currentUser.displayName || 'Collaborator',
        currentUser.email || '',
        countryId,
        categoryId
      );
    } else {
      // Local fallback
      setLocalAssignments((prev) => {
        const next = { ...prev };
        if (categoryId) {
          next[countryId] = categoryId;
        } else {
          delete next[countryId];
        }
        return next;
      });
    }

    if (categoryId) {
      // Tiny celebration feedback
      confetti({
        particleCount: 15,
        spread: 40,
        origin: { y: 0.8 },
      });
    }
  };

  const handleAddCategory = async (newCat: { name: string; color: string }) => {
    const category: Category = {
      id: 'cat_' + Date.now().toString(36),
      name: newCat.name,
      color: newCat.color,
    };

    if (mapDoc && currentUser && currentUser.uid === mapDoc.ownerId) {
      const updated = [...currentCategories, category];
      await updateMapCategories(mapDoc.id, updated);
    } else {
      setLocalCategories((prev) => [...prev, category]);
    }
  };

  const handleUpdateCategory = async (updatedCat: Category) => {
    if (mapDoc && currentUser && currentUser.uid === mapDoc.ownerId) {
      const updated = currentCategories.map((c) => (c.id === updatedCat.id ? updatedCat : c));
      await updateMapCategories(mapDoc.id, updated);
    } else {
      setLocalCategories((prev) =>
        prev.map((c) => (c.id === updatedCat.id ? updatedCat : c))
      );
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (mapDoc && currentUser && currentUser.uid === mapDoc.ownerId) {
      const updated = currentCategories.filter((c) => c.id !== categoryId);
      await updateMapCategories(mapDoc.id, updated);
    } else {
      setLocalCategories((prev) => prev.filter((c) => c.id !== categoryId));
    }
  };

  const handleSaveNote = async (content: string, existingNoteId?: string) => {
    if (!selectedCountry) return;

    if (currentUser && mapId) {
      await saveCountryNote(
        mapId,
        selectedCountry.id,
        selectedCountry.name,
        currentUser,
        content,
        existingNoteId
      );
    } else {
      const newNote: CountryNoteItem = {
        id: existingNoteId || 'local_note_' + Date.now(),
        mapId: 'local',
        countryId: selectedCountry.id,
        countryName: selectedCountry.name,
        authorId: currentUser?.uid || 'guest',
        authorName: currentUser?.displayName || 'You',
        authorEmail: currentUser?.email || '',
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setLocalNotes((prev) => {
        if (existingNoteId) {
          return prev.map((n) => (n.id === existingNoteId ? newNote : n));
        }
        return [newNote, ...prev];
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (mapId) {
      await deleteCountryNote(mapId, noteId);
    } else {
      setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  };

  const handleCreateNewMap = async () => {
    if (!currentUser) {
      try {
        const u = await loginWithGoogle();
        if (u) {
          const newId = await createMap('My World Map', u);
          window.location.search = `?map=${newId}`;
        }
      } catch (err) {
        console.error('Login error:', err);
      }
      return;
    }

    const title = prompt('Enter a name for your new collaborative map:', 'Our Adventures') || 'Our Adventures';
    const newId = await createMap(title, currentUser);
    window.location.search = `?map=${newId}`;
  };

  const handleUpdateTitle = async (title: string) => {
    if (mapDoc && currentUser?.uid === mapDoc.ownerId) {
      await updateMapTitle(mapDoc.id, title);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b1120] text-slate-100 font-sans">
      {/* Navigation Bar */}
      <Navbar
        mapDoc={mapDoc}
        currentUser={currentUser}
        collaborators={allCategorizations}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          if (mode === 'compare') setIsCompareOpen(true);
        }}
        onOpenShare={() => {
          if (!mapId && currentUser) {
            handleCreateNewMap();
          } else {
            setIsShareModalOpen(true);
          }
        }}
        onNewMap={handleCreateNewMap}
        onLogin={loginWithGoogle}
        onLogout={logoutUser}
        onUpdateTitle={handleUpdateTitle}
      />

      {/* Main Workspace Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {atlasLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#0a0f1d] text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Generating High-Precision World Map Outlines...</p>
          </div>
        ) : (
          <WorldMap
            features={features}
            activeAssignments={activeDisplayedAssignments}
            comparisonData={comparisonData}
            categories={currentCategories}
            selectedCountry={selectedCountry}
            notes={mapId ? allNotes : localNotes}
            onSelectCountryById={handleSelectCountryById}
            getCountryMeta={getCountryMeta}
          />
        )}

        {/* Floating Country Inspector Card (Top-Left, matching user screenshot) */}
        <div className="absolute top-4 left-4 z-20 max-w-[calc(100vw-2rem)]">
          <CountryCard
            country={selectedCountry}
            assignedCategory={selectedCountryCategory}
            categories={currentCategories}
            notes={selectedCountryNotes}
            currentUser={currentUser}
            allCountries={COUNTRIES_DATA}
            onSelectCountry={(c) => setSelectedCountry(c)}
            onAssignCategory={handleAssignCategory}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
          />
        </div>

        {/* Floating Category Legend & Palette Editor (Bottom-Right / Top-Right) */}
        <div className="absolute bottom-4 right-4 z-20 max-w-[calc(100vw-2rem)]">
          <CategoryLegend
            categories={currentCategories}
            stats={categoryStats}
            activeCategoryId={activeCategoryId}
            onSelectActiveCategory={setActiveCategoryId}
            isOwner={!mapDoc || (!!currentUser && currentUser.uid === mapDoc.ownerId)}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            totalCategorized={totalCategorizedCount}
          />
        </div>

        {/* Comparison Details Drawer (when Compare mode is selected) */}
        {viewMode === 'compare' && isCompareOpen && comparisonStats && comparisonData && (
          <div className="absolute top-4 right-4 z-30 max-w-[calc(100vw-2rem)]">
            <ComparisonPanel
              comparison={comparisonStats}
              categories={currentCategories}
              allCountries={COUNTRIES_DATA}
              userAName={currentUser?.displayName || 'You'}
              userBName={comparisonData.partnerName}
              onSelectCountryById={(id) => handleSelectCountryById(id)}
              onClose={() => setIsCompareOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <ShareModal
          mapId={mapId || 'demo'}
          mapTitle={mapDoc?.title || 'World Map'}
          collaborators={allCategorizations}
          currentUserId={currentUser?.uid}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}
