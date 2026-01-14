import React, { useState, useEffect } from 'react';
import { getPlaylists, createPlaylist, renamePlaylist, deletePlaylist, getPlaylistTracks, savePlaylistTracks } from '../stores/db';

export function PlaylistPanel({ isVisible, onClose, queue, tracks, onLoadPlaylist }) {
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (isVisible) {
      loadPlaylists();
    }
  }, [isVisible]);

  const loadPlaylists = async () => {
    const list = await getPlaylists();
    setPlaylists(list);
  };

  const handleCreate = async () => {
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    loadPlaylists();
  };

  const handleSaveQueueAsPlaylist = async () => {
    if (queue.length === 0) return;
    
    const name = prompt('Enter playlist name:');
    if (!name?.trim()) return;
    
    const playlistId = await createPlaylist(name.trim());
    const trackPaths = queue.map(t => t.path);
    await savePlaylistTracks(playlistId, trackPaths);
    loadPlaylists();
  };

  const handleLoad = async (playlist) => {
    const playlistTracks = await getPlaylistTracks(playlist.id);
    
    // Match playlist tracks to actual tracks by path
    const matchedTracks = [];
    for (const pt of playlistTracks) {
      const track = tracks.find(t => t.path === pt.trackPath);
      if (track) {
        matchedTracks.push(track);
      }
    }
    
    if (matchedTracks.length === 0) {
      alert('No tracks from this playlist were found in your current library. Make sure the same music folder is selected.');
      return;
    }
    
    if (matchedTracks.length < playlistTracks.length) {
      const missing = playlistTracks.length - matchedTracks.length;
      alert(`${missing} track(s) from this playlist were not found in your library.`);
    }
    
    onLoadPlaylist(matchedTracks);
    onClose();
  };

  const handleRename = async (id) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }
    await renamePlaylist(id, editingName.trim());
    setEditingId(null);
    setEditingName('');
    loadPlaylists();
  };

  const handleDelete = async (id) => {
    await deletePlaylist(id);
    setConfirmDelete(null);
    loadPlaylists();
  };

  const startEditing = (playlist) => {
    setEditingId(playlist.id);
    setEditingName(playlist.name);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[500px] max-w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Playlists</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <XIcon />
          </button>
        </div>

        {/* Save current queue button */}
        {queue.length > 0 && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <button
              onClick={handleSaveQueueAsPlaylist}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
            >
              <SaveIcon />
              Save Current Queue as Playlist ({queue.length} tracks)
            </button>
          </div>
        )}

        {/* Create new playlist */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreate}
              disabled={!newPlaylistName.trim()}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg transition"
            >
              Create
            </button>
          </div>
        </div>

        {/* Playlist list */}
        <div className="flex-1 overflow-y-auto p-2">
          {playlists.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <PlaylistIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No playlists yet</p>
              <p className="text-sm">Create one above or save your current queue</p>
            </div>
          ) : (
            playlists.map(playlist => (
              <div
                key={playlist.id}
                className="flex items-center gap-2 p-3 hover:bg-gray-100 rounded-lg group"
              >
                {editingId === playlist.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(playlist.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onBlur={() => handleRename(playlist.id)}
                    autoFocus
                    className="flex-1 px-2 py-1 border border-blue-500 rounded focus:outline-none"
                  />
                ) : (
                  <>
                    <button
                      onClick={() => handleLoad(playlist)}
                      className="flex-1 text-left"
                    >
                      <div className="font-medium text-gray-800">{playlist.name}</div>
                      <div className="text-xs text-gray-400">
                        Created {new Date(playlist.created).toLocaleDateString()}
                      </div>
                    </button>
                    
                    <button
                      onClick={() => startEditing(playlist)}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-opacity"
                      title="Rename"
                    >
                      <EditIcon />
                    </button>
                    
                    {confirmDelete === playlist.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(playlist.id)}
                          className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(playlist.id)}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 rounded transition-opacity"
                        title="Delete"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}

function PlaylistIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
